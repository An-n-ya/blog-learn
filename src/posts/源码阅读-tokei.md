---
title: 【源码阅读】- tokei
description: 解析代码行数统计工具tokei
---

最近经常阅读各种项目的源码，我需要直到项目的代码行数来了解项目的体量。tokei就是实现这样功能的一个小工具，它支持多种编程语言，可以识别注释、代码、空格，还能根据`.tokenignore`来忽略文件/文件夹，`.tokenignore`的语法和`.ignore`语法相同。

tokei是使用Rust编写的，使用了大量并行处理技术，这样该项目解析速度快、且代码质量高，因此tokei本身就是一个很适合学习的项目，tokei项目的代码量不大，如下图所示，一共只有4k+Rust代码。
```shell
===============================================================================
 Language            Files        Lines         Code     Comments       Blanks
===============================================================================
 BASH                    4           48           30           10            8
 JSON                    1         1643         1643            0            0
 Shell                   1           49           38            1           10
 TOML                    3          123          102            5           16
-------------------------------------------------------------------------------
 HTML                    1           12            9            1            2
 |- JavaScript           1           15           11            4            0
 (Total)                             27           20            5            2
-------------------------------------------------------------------------------
 Markdown                5         1507            0         1200          307
 |- JSON                 1           47           47            0            0
 |- Rust                 1            7            4            3            0
 |- Shell                1           16           14            0            2
 (Total)                           1577           65         1203          309
-------------------------------------------------------------------------------
 Rust                   23         4320         3619          130          571
 |- Markdown            13          374            5          318           51
 (Total)                           4694         3624          448          622
===============================================================================
 Total                  38         7702         5441         1347          914
===============================================================================
```

## 项目结构
先看下项目目录结构：
```shell
.
├── benchmark.sh
├── build.rs                        // 项目的预构建文件，用于执行编译前的操作，参考https://doc.rust-lang.org/cargo/reference/build-scripts.html
├── Cargo.lock
├── Cargo.toml                      // 项目信息
├── CHANGELOG.md
├── ci                              // 持续集成
│   ├── build.bash
│   ├── common.bash
│   ├── set_rust_version.bash
│   └── test.bash
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── fuzz                            // 模糊测试，用于增加测试覆盖度，使用的是libFuzzer
│   ├── Cargo.lock
│   ├── Cargo.toml
│   ├── fuzz_targets
│   └── README.md
├── languages.json                  // 用于表示项目所支持的语言的语言细节
├── LICENCE-APACHE
├── LICENCE-MIT
├── README.md
├── src                             // 项目代码
│   ├── cli.rs
│   ├── cli_utils.rs
│   ├── config.rs
│   ├── input.rs
│   ├── language
│   ├── lib.rs
│   ├── main.rs
│   ├── sort.rs
│   ├── stats.rs
│   └── utils
├── tests                           // 测试文件夹
│   ├── accuracy.rs
│   ├── data                        // 测试数据文件夹
│   └── embedding
└── tokei.example.toml
 
13 directories, 29 files
```

`src`目录下还有两个目录：`language`和`utils`，其中`language`目录是我们关注的重点。

我们再来关注下`Cargo.toml`文件里的依赖信息
```toml
[build-dependencies]
tera = "1.15"
ignore = "0.4"
serde_json = "1"

[dependencies]
aho-corasick = "0.7"
arbitrary = { version = "1", features = ["derive"] }
clap = { version = "3", features = ["cargo", "wrap_help"] }
colored = "2"
crossbeam-channel = "0.5"
encoding_rs_io = "0.1"
grep-searcher = "0.1"
ignore = "0.4"
log = "0.4"
rayon = "1.5.0"
serde = { version = "1.0.128", features = ["derive", "rc"] }
term_size = "0.3"
toml = "0.5"
parking_lot = "0.12"
dashmap = { version = "5.0.0", features = ["serde"] }
num-format = "0.4.0"
once_cell = "1.9"
regex = "1.5"
serde_json = "1"
dirs = "4"
```
这里边的`tera`是模板生成代码的工具，`clap`是解析命令行参数的，`ignore`是用于在遍历目录时忽略文件/文件夹用的，剩下的里边有很多是和并发编程相关的。

从依赖中就可以看出tokei实现代码统计的思路了，使用tera库生成结构高度相似的为每种语言实现区别注释/代码/空格的代码功能，使用clap解析命令行参数，根据不同参数执行不同策略，ignore需要被忽略的目录/文件夹。

## 代码生成
我们先看下代码生成，这部分逻辑写在`build.rs`里，这个文件的main函数很简单：
```rust
fn main() -> Result<(), Box<dyn error::Error>> {
    let out_dir = env::var_os("OUT_DIR").expect("No OUT_DIR variable.");
    generate_languages(&out_dir)?;
    generate_tests(&out_dir)?;

    Ok(())
}
```
只做了两件事：生成`language`文件，生成测试文件。生成的文件都放在`OUT_DIR`里，这是cargo的一个保留字，这个目录只会在编译期出现，编译后就自动删除了，所以我们没法直接看到生成的代码文件。

测试文件的模板硬编码在函数`generate_tests_batch`里，而language文件的模板在`src/language/language_type.tera.rs`里，而项目根目录下的`language.json`里是各种语言的配置信息，我们先看一眼`language.json`：
```json
{
    "language": {
        ...
        "Rust": {
          "line_comment": ["//"],
          "multi_line_comments": [["/*", "*/"]],
          "nested": true,
          "important_syntax": ["///", "//!"],
          "extensions": ["rs"],
          "quotes": [["\\\"", "\\\""], ["#\\\"", "\\\"#"]],
          "verbatim_quotes": [["r##\\\"", "\\\"##"], ["r#\\\"", "\\\"#"]]
        },
        ...
    }
}

```
结构很简单，就是一个大对象，`language`里边的每一项都代表一种语言的模板信息，以`Rust`语言为例，里边规定了rust语言的注释格式、引号格式、拓展名。

接下来看下`generate_languages`里发生了什么：
```rust
fn generate_languages(out_dir: &OsStr) -> Result<(), Box<dyn error::Error>> {
    let mut tera = tera::Tera::default();

    let mut json: Value = serde_json::from_reader(File::open(&"languages.json")?)?;

    for (_key, ref mut item) in json
        .get_mut("languages")
        .unwrap()
        .as_object_mut()
        .unwrap()
        .iter_mut()
    {
        macro_rules! sort_prop {
            ($prop:expr) => {{
                if let Some(ref mut prop) = item.get_mut($prop) {
                    prop.as_array_mut()
                        .unwrap()
                        .sort_unstable_by(compare_json_str_len)
                }
            }};
        }

        sort_prop!("quotes");
        sort_prop!("verbatim_quotes");
        sort_prop!("multi_line");
    }

    let output_path = Path::new(&out_dir).join("language_type.rs");
    let rust_code = tera.render_str(
        &std::fs::read_to_string("src/language/language_type.tera.rs")?,
        &tera::Context::from_value(json)?,
    )?;
    std::fs::write(output_path, rust_code)?;

    Ok(())
}
```
首先是初始化了模板生成器实例tera，然后从配置文件`language.json`中读取了json数据，对json数据做了一些规整，最后就是使用模板生成器tera在指定目录下生成`language_type.rs`文件了。至于模板文件`language_type.tera.rs`，这个文件只是定义了`LanguageType`结构里的很多方法，我们选一个方法来看下：
```rust
    pub fn line_comments(self) -> &'static [&'static str] {
        match self {
            {% for key, value in languages -%}
                {{key}} => &[{% for item in value.line_comment | default(value=[]) %}"{{item}}",{% endfor %}],
            {% endfor %}
        }
    }
```
里边`{%`和`%}`里的就是tera模板语法了，可以看到需要模板自动生成的是一个match结构，这个match里的arm由模板生成，即`language.json`里有多少种语言，这里就有多少arm，而`LanguageType`里的其他方法基本都是这样的`match`结构，所以Tokei使用了模板生成这样结构高度相似的代码。

## 入口函数
接下来看下入口函数`main.rs`，入口函数有点长，我不打算全部复制过来，只给看下主要的逻辑
```rust
    let mut cli = Cli::from_args();
    ...
    let mut languages = Languages::new();
    ...
    languages.get_statistics(&input, &cli.ignored_directories(), &config);
    ...
    printer.print_total(&languages)?;
    Ok(())
```
主要逻辑就是先创建解析命令行参数的cli实例，然后生成tokei中解析代码行数的实例`language`，最后是打印结果。解析命令行的函数`cli.rs`里都是常规写法，就不讲了。主要看下`language/language.rs`，这个文件中定义了`Language`结构，这里边比较重要的一个方法就是`get_statistics`，这个方法的逻辑很简单：
```rust
        utils::fs::get_all_files(paths, ignored, &mut self.inner, config);
        self.inner.par_iter_mut().for_each(|(_, l)| l.total());
```
第一行是递归遍历所有的目录，找到所有的代码文件。第二行是并行的处理每个代码文件，给每个代码文件调用`total()`方法，total方法统计所有种类语言的代码行数总和。那么代码行数分析发生在哪里呢？答：发生在`get_all_files`里，在递归遍历所有文件的时候就顺带执行了分析代码行数的代码了。

## 统计行数逻辑
tokei用`Language`结构管理所有的代码类型对应的代码行数，`Language`结构里只有一个成员：
```rust
pub struct Languages {
    inner: BTreeMap<LanguageType, Language>,
}
```
`LanguageType`表示语言类型，以及封装了很多语言相关的语法细节，而`Language`则用于存储当前语言的代码行数：
```rust
pub struct Language {
    /// The total number of blank lines.
    pub blanks: usize,
    /// The total number of lines of code.
    pub code: usize,
    /// The total number of comments(both single, and multi-line)
    pub comments: usize,
    /// A collection of statistics of individual files.
    pub reports: Vec<Report>,
    /// A map of any languages found in the reports.
    pub children: BTreeMap<LanguageType, Vec<Report>>,
    /// Whether this language had problems with file parsing
    pub inaccurate: bool,
}
```
里边的成员`reports`用于记录特定语言下每个代码文件的信息，这个reports是在遍历每个文件的时候调用`LanguageType::parse`得到的，而parse方法会调用`parse_lines`分析文件中的每一行：
```rust
let mut stepper = LineStep::new(b'\n', 0, lines.len());

while let Some((start, end)) = stepper.next(lines) {
    ...
}
```
上述代码就是在一个循环体中处理每一行，循环体中大量使用了`syntax`变量，这个变量是在`parse`方法里初始化的`let syntax = SyntaxCounter::new(self);`, SyntaxCounter的new方法又会初始化`SyntaxMatcher::new(language);`，这个`SyntaxMatcher`就是解析每一行的关键了，它的结构体定义如下：
```rust
pub(crate) struct SharedMatchers {
    pub language: LanguageType,
    pub allows_nested: bool,
    pub doc_quotes: &'static [(&'static str, &'static str)],
    pub important_syntax: AhoCorasick<u16>,
    #[allow(dead_code)]
    pub any_comments: &'static [&'static str],
    pub is_fortran: bool,
    pub is_literate: bool,
    pub line_comments: &'static [&'static str],
    pub any_multi_line_comments: &'static [(&'static str, &'static str)],
    pub multi_line_comments: &'static [(&'static str, &'static str)],
    pub nested_comments: &'static [(&'static str, &'static str)],
    pub string_literals: &'static [(&'static str, &'static str)],
    pub verbatim_string_literals: &'static [(&'static str, &'static str)],
}
```
这个结构在初始化的时候会调用生成代码`language_type.rs`的函数：
```rust
Self {
    language,
    allows_nested: language.allows_nested(),
    doc_quotes: language.doc_quotes(),
    is_fortran: language.is_fortran(),
    is_literate: language.is_literate(),
    important_syntax: init_corasick(language.important_syntax(), false),
    any_comments: language.any_comments(),
    line_comments: language.line_comments(),
    multi_line_comments: language.multi_line_comments(),
    any_multi_line_comments: language.any_multi_line_comments(),
    nested_comments: language.nested_comments(),
    string_literals: language.quotes(),
    verbatim_string_literals: language.verbatim_quotes(),
}
```
这样就能得到每种语言的语法关键字了，接下来只需要对每一行进行匹配就好了，比如像下面的代码：
```rust
if self.shared.is_literate
    || self
        .shared
        .line_comments
        .iter()
        .any(|c| line.starts_with(c.as_bytes()))
{
    stats.comments += 1;
    trace!("Comment No.{}", stats.comments);
} else {
    stats.code += 1;
    trace!("Code No.{}", stats.code);
}
```
使用了`any`来匹配`line_comments`语法。


结构体`SyntaxCounter`还作为一个状态机使用，当遇到多行注释时，需要保存当时的状态。
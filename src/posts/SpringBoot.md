---
title: SpringBoot学习日记
description: 记录学习SpringBoot的过程
---

## 使用Jersey建立Restful服务
### 什么是Jersey？
Jersey是一个实现了JAX-RS(**Jakarta RESTful Web Services**)标准的框架，即帮助开发者开发RESTful的api的工具，它提供了许多注解来定义接口。JAX-RS是在[JSR-339](https://jcp.org/en/jsr/detail?id=339)下定义的

但Jersey和Spring MVC有什么区别呢？在我看来，两者的主要区别仅仅在于Jersey是符合标准的实现，而Spring MVC的实现是非标准的。不过Spring MVC的使用人数已经那么多了，是不是符合标准也没那么重要了。不过我本着好奇的心里去试了试Jersey，发现JAX-RS的注解确实更清晰一些。

两者的注解对比：
<table>
  <thead>
    <tr>
      <th>Spring Annotation</th>
      <th>JAX-RS Annotation</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>@RequestMapping(path = “/troopers”)</td>
      <td>@Path(“/troopers”)</td>
    </tr>
    <tr>
      <td>@PostMapping</td>
      <td>@POST</td>
    </tr>
    <tr>
      <td>@PutMapping</td>
      <td>@PUT</td>
    </tr>
    <tr>
      <td>@GetMapping</td>
      <td>@GET</td>
    </tr>
    <tr>
      <td>@DeleteMapping</td>
      <td>@DELETE</td>
    </tr>
    <tr>
      <td>@ResponseBody</td>
      <td>N/A</td>
    </tr>
    <tr>
      <td>@RequestBody</td>
      <td>N/A</td>
    </tr>
    <tr>
      <td>@PathVariable(“id”)</td>
      <td>@PathParam(“id”)</td>
    </tr>
    <tr>
      <td>@RequestParam(“xyz”)</td>
      <td>@QueryParam(‘xyz”)</td>
    </tr>
    <tr>
      <td>@RequestParam(value=”xyz”)</td>
      <td>@FormParam(“xyz”)</td>
    </tr>
    <tr>
      <td>@RequestMapping(produces = {“application/json”})</td>
      <td>@Produces(“application/json”)</td>
    </tr>
    <tr>
      <td>@RequestMapping(consumes = {“application/json”})</td>
      <td>@Consumes(“application/json”)</td>
    </tr>
  </tbody>
</table>

### 在Spring Boot下使用Jersey
其实Jersey和Spring可以结合着使用，在spring boot项目中加入 `spring-boot-starter-jersey` 依赖就可以直接使用jersey啦。

#### 创建项目
在[spring initializr](https://start.spring.io/)下创建一个spring boot项目。在项目中添加`spring-boot-starter-jersey`依赖，并创建 config 文件夹和 endpoint 文件夹，目录结构如下
src
├── main
│   ├── java
│   │   └── host
│   │       └── ankh
│   │           └── jeyseylearn
│   │               ├── Application.java
│   │               ├── config
│   │               │   └── JerseyConfig.java
│   │               └── endpoint
│   │                   ├── HelloEndpoint.java
│   │                   └── ReverseReturnEndpoint.java
│   └── resources
│       └── application.properties
└── test
    └── java
        └── host
            └── ankh
                └── jeyseylearn
                    └── JerseyLearnApplicationTests.java

编辑JerseyConfig.java文件：
```java
@Configuration  
public class JerseyConfig extends ResourceConfig {  
    public JerseyConfig() {  
        register(HelloEndpoint.class);  
        register(ReverseReturnEndpoint.class);  
    }  
}
```
这里的`ResourceConfig`是jersey包下的，`@Configuration`则是spring的。

编写Endpoint文件：
```java
// src/main/java/host/ankh/jerseylearn/endpoint/HelloEndpoint.java
import jakarta.ws.rs.GET;  
import jakarta.ws.rs.Path;  
import jakarta.ws.rs.Produces;  
import org.springframework.stereotype.Service;

@Service  
@Path("/hello")  
public class HelloEndpoint {  
    @GET  
    @Produces("text/plain")  
    public String hello() {  
        return "hello from spring";  
    }  
}
```
这里用到的`GET, Path, Produces`都是属于标准的JAX-RS注解了（原来是在javax包下的，现在改为jakarta了），这个endpoint只是单纯返回一个String，有点太简单了，下面来个复杂点的。
```java
// src/main/java/host/ankh/jerseylearn/endpoint/ReverseReturnEndpoint.java
import jakarta.validation.constraints.NotNull;  
import jakarta.ws.rs.GET;  
import jakarta.ws.rs.Path;  
import jakarta.ws.rs.Produces;  
import jakarta.ws.rs.QueryParam;  
import org.springframework.stereotype.Service;  
  
@Service  
@Path("/reverse")  
public class ReverseReturnEndpoint {  
  
    @GET  
    @Produces("text/plain")  
    public String reverse(@QueryParam("data") @NotNull String data) {  
        return new StringBuilder(data).reverse().toString();  
    }  
  
}
```
这里用了`@QueryParam` 从`Params`中获取参数，并使用`@NotNull`注解表示这个参数是必须的，否则该接口会报错。

下面设置下springboot的参数：
```properties
server.port=8086  
server.servlet.context-path=/api  
spring.main.banner-mode=off  
  
logging.level.org.springframework=ERROR
```
springboot启动的时候太花里胡哨了，让人分不清有效信息，这里把多余的信息都去掉了。

#### 启动并测试项目
在项目根目录下运行`mvn spring-boot:run`启动项目，然后访问接口：
```shell
$ curl 'http://localhost:8086/api/hello'
hello
$ curl 'http://localhost:8086/api/reverse?data=hello'
olleh
```
结果符合预期。使用curl命令测试太麻烦了，我们去写一个测试类：
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)  
class JerseyLearnApplicationTests {  
   @Inject  
   private TestRestTemplate restTemplate;  
  
   @Test  
   void hello() {  
      ResponseEntity<String> entity = this.restTemplate.getForEntity("/hello", String.class);  
      assert(entity.getStatusCode().is2xxSuccessful());  
      assert(entity.getBody().equals("hello from spring"));  
   }  
  
   @Test  
   void reverse() {  
      ResponseEntity<String> entity = this.restTemplate.getForEntity("/reverse?data=hello", String.class);  
      assert entity.getStatusCode().is2xxSuccessful();  
      assert entity.getBody().equals("olleh");  
   }  
  
   @Test  
   void validation() {  
      ResponseEntity<String> entity = this.restTemplate.getForEntity("/reverse", String.class);  
      assert entity.getStatusCode().is4xxClientError();  
   }  
}
```
然后运行`mvn test`，结果如下：
```shell
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.161 s - in host.ankh.jeyseylearn.JerseyLearnApplicationTests
[INFO]
[INFO] Results:
[INFO]
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  2.671 s
[INFO] Finished at: 2023-01-10T14:55:52+08:00
[INFO] ------------------------------------------------------------------------
```
测试成功!

#### 参考资料：
https://www.vogella.com/tutorials/REST/article.html
https://zetcode.com/springboot/jersey/

#### 下一步
使用jersey编写 [Hypermedia-Driven](https://en.wikipedia.org/wiki/HATEOAS) 的restful接口
解析更复杂的参数和返回更复杂内容
自定义返回错误信息




## 使用腾讯与的短信功能实现验证码注册
首先我们需要实现注册功能，然后在注册功能的基础上添加验证码功能
### 实现注册功能
#### 前端
前端只需要添加一个注册页面就好了
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230115192241.png)
给“确认”和“返回”按钮添加点击事件：
```javascript
    document.querySelector("#verifycode-btn").addEventListener("click", (e) => {
        // TODO: 字段校验功能
        let btn = e.target;
        // 将button禁用
        btn.disabled = true;
        // 等待时间，单位为秒
        let waitTime = 60;
        // setInterval方法给的id, 用来取消interval
        let intervId;
        if (!intervId) {
            let curCount = 1;
            btn.value = `${waitTime}秒后再试`;
            // 启动一个间隔为1秒的定时器
            intervId = setInterval(() => {
                btn.value = `${waitTime - curCount}秒后再试`;
                curCount += 1;
            }, 1000);
        }
        setTimeout(() => {
            btn.disabled = false;
            clearInterval(intervId);
            btn.value = "获取验证码"
        }, 1000 * waitTime);
    });

    document.querySelector("#return-btn").addEventListener("click", (e) => {
        window.location.href = "login.html";
    });
```

#### 添加用户管理的后端代码
我们此时需要添加一个新的endpoint，就叫`AccountEndpoinot`好了，我们希望使用json的方式进行前后端沟通，于是编写如下代码：
```java
@Service
@Path("/account")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Slf4j
public class AccountEndpoint {

    @Inject
    AccountService accountService;

    @POST
    @Path("/create")
    // 如果这里的Valid验证失败，会抛出ValidationException
    public Response create(@Valid Account account) {
        return CommonResponse.op(() -> accountService.createAccount(account));
    }

}
```
上面的代码有以下几点需要注意
- 这里使用了`@Produces`和`@Consumes`注解，并传入了`MediaType.APPLICATION_JSON`表示接受和返回json格式的数据。
- 父级Path是`/account`，子级Path是`/create`，再加上JerseyConfig文件中设置的`/api`，我们如果要访问这个接口，就需要使用`/api/account/create`。
- `AccountService`是对Account进行各种操作的服务类，注入到这里的endpoint来进行使用。
- create方法直接返回一个对象即可，jersey会自动帮我们转换成json格式
- 我们使用了一个帮助类`CommonResponse`帮助我们对返回信息进行格式化，并且可以自动处理异常

AccountService的代码如下：
```java
@Named
@Slf4j
public class AccountService {
    @Inject
    private AccountRepository accountRepository;

    // 在 SecurityConfig 文件中有PasswordEncoder的Bean，所以这里能够注入成功
    @Inject
    private PasswordEncoder passwordEncoder;

    /**
     * 创建一个用户，注意：密码需要加密存储
     */
    public void createAccount(Account account) {
        // 加密密码
        var pass = passwordEncoder.encode(account.getPassword());
        account.setPassword(pass);
        // 调用jpa存储到数据库
        accountRepository.save(account);
    }
}
```
要点写在注释里了，在存储前，我们需要用Bcrypt算法对密码明文进行加密。我们使用jpa的`save`方法，对account进行存储。

帮助类CommonResponse代码如下：
```java
@Slf4j
public abstract class CommonResponse {
    // 获取相应的状态和message，构建Response
    public static Response send(Response.Status status, String message) {
        Integer code = status.getStatusCode();
        return Response.status(status)
                .type(MediaType.APPLICATION_JSON)
                .entity(new host.ankh.jeyseylearn.infrastructure.jaxrs.CodedMessage(code, message))
                .build();
    }

    // 对send的封装
    public static Response failure(String message) {
        return send(Response.Status.INTERNAL_SERVER_ERROR, message);
    }
    // 对send的封装
    public static Response success(String message) {
        return send(Response.Status.OK, message);
    }
    // 对send的封装
    public static Response success() {
        return send(Response.Status.OK, "success");
    }

    // 封装执行代码的操作，返回Response，自动处理错误
    public static Response op(Runnable runner, Consumer<Exception> exceptionConsumer) {
        try {
            runner.run();
            return success();
        } catch (Exception e) {
            exceptionConsumer.accept(e);
            return failure(e.getMessage());
        }
    }

    // 对op的封装
    public static Response op(Runnable runner) {
        // log.error用法：接受两个参数，错误信息String：e.getMessage(), 错误对象Throwable: e
        return op(runner, e -> log.error(e.getMessage(), e));
    }
}
```
CommonResponse的核心是send方法，我们构造一个包含`code, message, data`属性的实例，然后转化成JSON type的Response返回。
剩下的函数都是对send方法的包装罢了，op方法可以接受一个“可执行的代码块”，并接受一个消费Exception的消费者，如果发生错误，会调用这个消费者，然后返回failue。

后端的基本代码就是如此，别忘了我们还需要改下配置类：`JerseyConfig`和`SecurityConfig`，好让我们的新代码生效。

#### 修改JerseyConfig
每次我们添加一个新的endpoint都需要在JerseyConfig里边注册，这样子太麻烦了，我们写一个帮助方法，借助Spring提供的功能自动扫描固定目录下的endpoint
```diff
    public JerseyConfig() {
-       register(HelloEndpoint.class);
-       register(ReverseReturnEndpoint.class);
+       scanPackages("host.ankh.jeyseylearn.endpoint");
+       scanPackages("host.ankh.jeyseylearn.infrastructure.jaxrs");
    }

+    /**
+     * 自动注册目录下的Path，Provider到Jersey
+     * @param scanPackage
+     */
+    private void scanPackages(String scanPackage) {
+        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
+        scanner.addIncludeFilter(new AnnotationTypeFilter(Path.class));
+        scanner.addIncludeFilter(new AnnotationTypeFilter(Provider.class));
+        this.registerClasses(scanner.findCandidateComponents(scanPackage).stream()
+                .map(beanDefinition -> ClassUtils.resolveClassName(Objects.requireNonNull(beanDefinition.getBeanClassName()), this.getClassLoader()))
+                .collect(Collectors.toSet()));
+    }
```
我们只扫描被`@Path`和`@Provider`注释过的类。这里的Provider我们在[[#处理边界条件]]中会用到

#### 测试
```java
	@Test
	void createAccountAndLoginWithThisAccount() throws Exception {
		var account = new Account("ankh", "ankh", "ankh", "17911112222", "ankh04@icloud.com");
		post_json("/account/create", account);
		Form form = new Form();
		form.param("username", "ankh");
		form.param("password", "ankh");
		Invocation.Builder builder = ClientBuilder.newClient()
				.target("http://localhost:" + port + "/login")
				.property(ClientProperties.FOLLOW_REDIRECTS, false)
				.request(MediaType.MULTIPART_FORM_DATA).accept(MediaType.TEXT_PLAIN);
		var res = builder.post(Entity.form(form));
		// 应该会重定位到主页
		assertRedirect(res);
		// 设置cookies
		setCookies(res.getCookies());
		// 访问需要权限的接口
		var res2 = get("/reverse?data=hello");
		assertOK(res2);
		assert res2.readEntity(String.class).equals("olleh");
	}
```
我稍微修改了下`JAXRSResourceBase`，让它支持了json格式的输入输出。然后调用注册接口，然后用新注册的账号登录，最后访问需要登录权限的`/reverse`接口。
这一个测试用力包含了好多接口，这样的用例并不是很好...不过还是测试通过了。

然后我们用httpie在命令行做一下测试，测试脚本如下：
```shell
#!/usr/bin/bash
http POST http://localhost:8088/api/account/create username=ankh password=ankh name=ankh telephone=17399998888 email=ankh04@icloud.com 
```
直接在命令行执行这个文件就可以测试啦，效果如下：
```shell
➜  account git:(main) ✗ ./create_account.http
HTTP/1.1 200
Cache-Control: no-cache, no-store, max-age=0, must-revalidate
Connection: keep-alive
Content-Length: 44
Content-Type: application/json
Date: Sun, 15 Jan 2023 07:35:28 GMT
Expires: 0
Keep-Alive: timeout=60
Pragma: no-cache
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
 
{
    "code": 200,
    "data": null,
    "message": "success"
}
```
这样接口测试就更全面了。


#### 处理边界条件
直接使用错误的用户进行登录会导致错误，然后被重定向到login，所以会收到302
```shell
➜  account git:(main) ✗ ./create_wrong_account.http
HTTP/1.1 302
Cache-Control: no-cache, no-store, max-age=0, must-revalidate
Connection: keep-alive
Content-Length: 0
Date: Sun, 15 Jan 2023 08:14:44 GMT
Expires: 0
Keep-Alive: timeout=60
Location: http://localhost:8088/login.html
Pragma: no-cache
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
```
发生上面错误的原因是，我们已经在Account的entity上写了validation的注解，RAXRS会为我们校验，在RAXRS的runtime在校验失败的时候，会抛出`ConstraintViolationException`，runtime会自己处理这个错误。为了避免302，我们可以编写自己的exception处理函数。

#### 实现JAXRS ExceptionMapper
JAXRS很好的一个地方是，我们可以任意扩展它的运行时行为。具体来说，只需要实现一些接口，然后把它用@Provider注解暴露给JAXRS。 


然后再次尝试，查看结果：
```shell
➜  account git:(main) ✗ ./create_wrong_account.http
HTTP/1.1 400
Cache-Control: no-cache, no-store, max-age=0, must-revalidate
Connection: close
Content-Length: 61
Content-Type: application/json
Date: Sun, 15 Jan 2023 08:39:20 GMT
Expires: 0
Pragma: no-cache
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
 
{
    "code": 400,
    "data": null,
    "message": "用户名不允许为空"
}
```
成功检测到了用户名为空，是符合预期的。



### 给注册接口添加验证码
这一块其实比较复杂，因为要使用第三方的服务，密码不能直接写在源代码里，应该使用配置中心管理。
另一方面，需要设置验证码的有效时间，因此需要用到redis的部分功能。
#### 腾讯云短信服务
我使用腾讯云的短信功能来做验证码，先去腾讯云填一些资料，申请通过后就可以用腾讯云提供的SDK使用短信功能啦。 
我在`infrastructure`下新建了一个`third_party_service`的目录，在这个目录里添加SendSms工具类，如下：
```java
public class SendSms {
    // 因为我的模板只用两个参数：
    //     {1}为您的短信验证码，请于{2}分钟内登录。
    // 所以这里有两个入参，一个是短信验证码，一个是验证码ttl
    // 剩下的一个入参就是电话号码
    public static SendSmsResponse send(String code, String time, String telephone) {
        // TODO: 使用配置中心传入secretKey
        // 这里使用环境变量读取的方式，需要现在环境变量中先设置这两个值
        Credential cred = new Credential(System.getenv("SecretId"), System.getenv("SecretKey"));

        // 只支持三个区域： 北京 广州 南京
        SmsClient client = new SmsClient(cred, "ap-guangzhou");
        // 实例化一个请求对象
        SendSmsRequest req = new SendSmsRequest();

        // 短信应用ID
        String sdkAppId = "1400790975";
        req.setSmsSdkAppId(sdkAppId);

        // 短信签名内容
        String signName ="我的计算机学习记录个人网";
        req.setSignName(signName);

        // 模板ID
        String templateId = "1669702";
        req.setTemplateId(templateId);

        // 模板参数
        String[] templateParamSet = {code, time};
        req.setTemplateParamSet(templateParamSet);

        // 下发手机号
        String[] phoneNumberSet = {telephone};
        req.setPhoneNumberSet(phoneNumberSet);

        try {
            SendSmsResponse res = client.SendSms(req);
            return res;
        } catch (TencentCloudSDKException e) {
            throw new RuntimeException(e);
        }
    }
}
```
在使用这个类的时候，需要先在环境变量中传入secret值:
```shell
export SecretId=xxxxxxx
export SecretKey=xxxxxxxx
```
把这个类的调用放到CommandLineRunner中，启动springboot就发现短信已经发到手机了。


#### 使用nacos配置中心管理密码
按照[nacos官方文档](https://nacos.io/zh-cn/docs/v2/quickstart/quick-start.html)安装nacos并启动。
启动之后nacos会在本地启动一个服务，我们可以通过web的方式进入管理界面：http://127.0.0.1:8848/nacos

进入后可以在管理界面以图形化的方式设置我们的秘钥：
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230116104102.png)

然后在命令行使用下面的命令测试：
```shell
curl -X GET "http://localhost:8848/nacos/v1/cs/configs?dataId=TencentSMS&group=DEFAULT_GROUP"
```
返回的就是我们的json格式的秘钥啦。

在java后端中，我们需要添加一个entity：
```java
@Entity
public class Secret {
    @Id
    public String SecretId;
    public String SecretKey;
}
```
然后修改`SendSms.java`
```diff
    public static SendSmsResponse send(String code, String time, String telephone) {
+        var res = ClientBuilder.newClient()
+                .target("http://localhost:8848/nacos/v1/cs/configs?dataId=TencentSMS&group=DEFAULT_GROUP")
+                .request(MediaType.TEXT_PLAIN)
+                .accept(MediaType.APPLICATION_JSON)
+                .get();
+        var secret = res.readEntity(Secret.class);

-        Credential cred = new Credential(System.getenv("SecretId"), System.getenv("SecretKey"));
+        Credential cred = new Credential(secret.SecretId, secret.SecretKey);
```
这样就完成了一个简单的RPC：由我们的后端向nacos发起请求获取配置信息。
 
#### 使用Redis存储验证码
添加spring data redis依赖：
```xml
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-data-redis</artifactId>
		</dependency>
```
增加redis的帮助类
```java
@Named
public class RedisServiceImpl implements RedisService {
    @Inject
    private StringRedisTemplate redisTemplate;

    @Override
    public void set(String key, String value) {
        redisTemplate.opsForValue().set(key, value);
    }

    @Override
    public String get(String key) {
        return redisTemplate.opsForValue().get(key);
    }

    @Override
    public boolean expire(String key, long expire) {
        // 以秒为单位设置key的过期时间
        return redisTemplate.expire(key, expire, TimeUnit.SECONDS);
    }

    @Override
    public void remove(String key) {
        redisTemplate.delete(key);
    }

    @Override
    public Long increment(String key, long delta) {
        return redisTemplate.opsForValue().increment(key, delta);
    }
}
```

在AccountService中加入验证码相关的功能
```java
    @Override
    public void generateVerifyCode(String telephone) {
        // 生成验证码
        var verifyCode = makeVerifyCode(telephone);
        // 发送验证码
        var expire_minute = Math.ceilMod(VERIFY_CODE_EXPIRE_SECONDS, 60);
        SendSms.send(verifyCode, String.valueOf(expire_minute), telephone);
    }

    /**
     * 随机生成六位数字验证码，并保存到redis
     * @param telephone
     * @return
     */
    public String makeVerifyCode(String telephone) {
        // TODO: 如果redis中已经有该手机了，且过去没有多久，拒绝生成验证码
        var sb = new StringBuilder();
        var rand = new Random();
        // 随机生成六位数字校验码
        for (int i = 0; i < 6; i++) {
            sb.append(rand.nextInt(10));
        }
        var verifyCode = sb.toString();
        // 保存进redis
        redisService.set(telephone, verifyCode);
        // 设置过期时间
        redisService.expire(telephone, VERIFY_CODE_EXPIRE_SECONDS);
        return verifyCode;
    }

    @Override
    public boolean checkVerifyCode(String telephone, String verifyCode) {
        var target = redisService.get(telephone);
        return verifyCode.equals(target);
    }
```
这里的generateVerifyCode被拆分成了两步：1. 生成数字验证码保存到redis 2. 调用腾讯接口发送短信
这样拆分的目的可以让逻辑更清晰，更重要的是方便测试。下面来看看测试类:
```java
	@Test
	void createAccountWithoutAuth() throws Exception {
		var verifyCode = accountService.makeVerifyCode("17911112222");
		var account = new AccountWithVerifyCode("ankh", "ankh", "ankh", "17911112222", "ankh04@icloud.com", verifyCode);
		var res = post_json("/account/create", account);
		assertOK(res);
	}
```
由于我们现在注册需要加上验证码，我们调用`makeVerifyCode`直接从后台拿到验证码信息，然后调用`/account/create`接口创建账户


#### 前端代码
由于我们的后端接口是接受json的request，而前端表单提交默认是form payload，所以我们使用axios自己发出请求：
```diff
    <div class="btn-group-box">
        <input id="return-btn" type="button" value="返回">
-       <input type="submit" value="确认">
+       <!--不能使用type：button，以为那样是form注册, 在这里我们使用axios发送json负载的请求-->
+       <input id="submit-btn" type="button" value="确认">
    </div>
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
+        document.querySelector("#submit-btn").addEventListener("click", (e) => {
+        let telephone = document.querySelector('#telephone-input').value;
+        let password = document.querySelector('#password-input').value;
+        let username = document.querySelector('#username-input').value;
+        let verifycode = document.querySelector('#verifycode-input').value;
+        if (!telephone | !password | !username | !verifycode) {
+            // 填写信息不全，返回
+            return;
+        }
+        axios.post('/api/account/create', {
+            username,
+            password,
+            telephone,
+            verifyCode: verifycode
+        });
+    });

```

#### 下一步
- Spring Security JWT
- Swagger

#### 参考资料
java EE7 文档  https://docs.oracle.com/javaee/7/tutorial/partwebsvcs.htm#BNAYK
JAX RS 教程 https://www.logicbig.com/tutorials/java-ee-tutorial/jax-rs/getting-started-with-jax-rs.html
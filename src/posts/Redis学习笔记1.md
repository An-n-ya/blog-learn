---
title: Redis学习笔记
description: 
---

## HyperLogLog
HyperLogLog是用来统计计数的一个算法，它适合大规模计数且不要求精度的场景，比如统计用户访问量。在Redis中使用`PFADD key element [element...]`指令来添加element，通过`PFCOUNT key [key...]`来统计基数：
```shell
> PFADD test "hello"
1) (integer) 1
> PFADD test "world"
1) (integer) 1
> PFADD test "hello"
1) (integer) 1
> PFCOUNT test
(integer) 2
```
HyperLogLog的原理是：均匀分布的随机数集合的基数统计可以通过每个数字的最大前导零来估计，比如如果该集合中数字的最大前导零是n，那么该集合中不同元素的估计值就为2的n次方。
直接使用上述原理的HyperLogLog的估计值的方差会很大（简单理解就是不太准确），为了克服这个缺点，可以通过计算集合中每个数字的前导零数量，然后使用“调和平均数”估计，以减小方差。

可以将HyperLogLog的算法描述成以下形式：
- ==Add==操作
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230326154012.png)
先用哈希函数h把输入的值val转化成哈希值（这样就保证了均匀分布的条件），然后把该二进制的前b位提取出来加1获得j，然后通过Mj来保存该哈希值的最大前导零数量。

- ==Count==操作
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230326154240.png)
Z是M数组的调和平均数，am是一个与m（桶个数）相关的常量，最后把他们乘起来得到估计值。

这里的am计算起来比较麻烦，实际代码中常常使用一些近似值：
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230326154420.png)

下面我们用python代码实现上述过程：
```python
import math
import hashlib

class HyperLogLog:
    def __init__(self, m):
        self.m = m
        self.M = [0] * (2**m)
        self.alpha = self.get_alpha(m)
    
    def add(self, element):
        x = self.hash(element)
        j = x & (2**self.m-1)
        w = x >> self.m
        self.M[j] = max(self.M[j], self.get_trailing_zeros(w)+1)
    
    def count(self):
        Z = self.linear_counting()
        if Z <= 2.5 * self.m:
            V = self.sparse_estimator()
            if V:
                return V
        return self.hll_estimator(Z)
    
    def hash(self, element):
        md5 = hashlib.md5()
        md5.update(element.encode('utf-8'))
        return int(md5.hexdigest(), 16)
    
    def get_trailing_zeros(self, x):
        if x == 0:
            return 0
        i = 1
        while x & 1 == 0:
            i += 1
            x >>= 1
        return i
    
    def get_alpha(self, m):
        if m == 4:
            return 0.673
        elif m == 5:
            return 0.697
        elif m == 6:
            return 0.709
        else:
            return 0.7213 / (1 + 1.079 / (2**m))
    
    def linear_counting(self):
        V = len([x for x in self.M if x == 0])
        return self.m * math.log(self.m / V) if V > 0 else self.m
    
    def sparse_estimator(self):
        V = 0
        S = [(self.get_trailing_zeros(x)-1) for x in self.M if x > 0 and x <= self.m/30]
        if S:
            V = self.m * math.log(self.m/len(S)) + sum(2**(-x) for x in S)
        return V
    
    def hll_estimator(self, Z):
        return round(self.alpha * (2**self.m)**2 / Z, 0)
```
可以通过下面的方式使用该类：
```python
hll = HyperLogLog(16) # 初始化一个m=16的HyperLogLog对象

hll.add("hello")
hll.add("world")
hll.add("foo")
hll.add("bar")
hll.add("hello") # 添加重复元素，HyperLogLog会自动去重

count = hll.count() # 获取估计的元素数量

print("Estimated count: %d" % count)
```

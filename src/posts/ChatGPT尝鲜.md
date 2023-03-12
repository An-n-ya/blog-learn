---
title: ChatGPT尝鲜
description: 尝试使用各种与chatGPT相关的技术
---
## openai添加信用卡

在openai中添加信用卡比较麻烦，国内的信用卡都是绑定不上的，可以试试虚拟信用卡Depay。Depay只接受USDT（一种虚拟货币）的充值，需要到虚拟货币交易平台（比如币安）购买USDT，然后转到Depay。

如果信用卡被openai拒绝，试着换几个vpn节点。


## visual-chatGPT
微软昨天（2023年3月11日）发布了visual-chatGPT，它可以让chatGPT能够处理图片、理解图片内容。
visual-chatGPT的实现不算复杂，它需要使用者在本地部署一些`Foundation Model`：
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230312094839.png)
这些Foundation Model都和图片处理相关，使用它们需要很复杂的prompt。而visual chatGPT把chatGPT拉了进来，利用chatGPT的大语言模型，可以把使用者的意图转化成Foundation Model可以理解的prompt，整体架构如下所示：
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230312095103.png)

visual-chatGPT只需要使用者在本地跑一些显存使用量较小的`Foundation Model`，利用远端的chatGPT这样的大语言模型处理prompt，这是一种很好的prompt工程思路。

### 安装使用visual chatGPT
Visual ChatGPT安装并不复杂，把[repo](https://github.com/microsoft/visual-chatgpt)下载下来后，运行如下指令即可：
```shell
# create a new environment
conda create -n visgpt python=3.8

# activate the new environment
conda activate visgpt

#  prepare the basic environments
pip install -r requirement.txt

# download the visual foundation models
bash download.sh

# prepare your private openAI private key
export OPENAI_API_KEY={Your_Private_Openai_Key}

# create a folder to save images
mkdir ./image

# Start Visual ChatGPT !
python visual_chatgpt.py
```
需要把`OPENAI_API_KEY`替换成自己的。

然后还需要更改下文件`visual_chatgpt.py`，删除一些`tool`以适应自己的显卡情况：
```python
class ConversationBot:
    def __init__(self):
        print("Initializing VisualChatGPT")
        self.llm = OpenAI(temperature=0)
        self.edit = ImageEditing(device="cuda:0")
        self.i2t = ImageCaptioning(device="cuda:0")
        self.t2i = T2I(device="cuda:0")
        # self.image2canny = image2canny()
        # self.canny2image = canny2image(device="cuda:0")
        # self.image2line = image2line()
        # self.line2image = line2image(device="cuda:0")
        # self.image2hed = image2hed()
        # self.hed2image = hed2image(device="cuda:0")
        # self.image2scribble = image2scribble()
        # self.scribble2image = scribble2image(device="cuda:0")
        # self.image2pose = image2pose()
        # self.pose2image = pose2image(device="cuda:0")
        # self.BLIPVQA = BLIPVQA(device="cuda:0")
        # self.image2seg = image2seg()
        # self.seg2image = seg2image(device="cuda:0")
        # self.image2depth = image2depth()
        # self.depth2image = depth2image(device="cuda:0")
        # self.image2normal = image2normal()
        # self.normal2image = normal2image(device="cuda:0")
        self.pix2pix = Pix2Pix(device="cuda:0")
        self.memory = ConversationBufferMemory(memory_key="chat_history", output_key='output')
        self.tools = [
            Tool(name="Get Photo Description", func=self.i2t.inference,
                 description="useful when you want to know what is inside the photo. receives image_path as input. "
                             "The input to this tool should be a string, representing the image_path. "),
            Tool(name="Generate Image From User Input Text", func=self.t2i.inference,
                 description="useful when you want to generate an image from a user input text and save it to a file. like: generate an image of an object or something, or generate an image that includes some objects. "
                             "The input to this tool should be a string, representing the text used to generate image. "),
            Tool(name="Remove Something From The Photo", func=self.edit.remove_part_of_image,
                 description="useful when you want to remove and object or something from the photo from its description or location. "
                             "The input to this tool should be a comma seperated string of two, representing the image_path and the object need to be removed. "),
            Tool(name="Replace Something From The Photo", func=self.edit.replace_part_of_image,
                 description="useful when you want to replace an object from the object description or location with another object from its description. "
                             "The input to this tool should be a comma seperated string of three, representing the image_path, the object to be replaced, the object to be replaced with "),

            Tool(name="Instruct Image Using Text", func=self.pix2pix.inference,
                 description="useful when you want to the style of the image to be like the text. like: make it look like a painting. or make it like a robot. "
                             "The input to this tool should be a comma seperated string of two, representing the image_path and the text. "),
            # Tool(name="Answer Question About The Image", func=self.BLIPVQA.get_answer_from_question_and_image,
            #      description="useful when you need an answer for a question based on an image. like: what is the background color of the last image, how many cats in this figure, what is in this figure. "
            #                  "The input to this tool should be a comma seperated string of two, representing the image_path and the question"),
            # Tool(name="Edge Detection On Image", func=self.image2canny.inference,
            #      description="useful when you want to detect the edge of the image. like: detect the edges of this image, or canny detection on image, or peform edge detection on this image, or detect the canny image of this image. "
            #                  "The input to this tool should be a string, representing the image_path"),
            # Tool(name="Generate Image Condition On Canny Image", func=self.canny2image.inference,
            #      description="useful when you want to generate a new real image from both the user desciption and a canny image. like: generate a real image of a object or something from this canny image, or generate a new real image of a object or something from this edge image. "
            #                  "The input to this tool should be a comma seperated string of two, representing the image_path and the user description. "),
            # Tool(name="Line Detection On Image", func=self.image2line.inference,
            #      description="useful when you want to detect the straight line of the image. like: detect the straight lines of this image, or straight line detection on image, or peform straight line detection on this image, or detect the straight line image of this image. "
            #                  "The input to this tool should be a string, representing the image_path"),
            # Tool(name="Generate Image Condition On Line Image", func=self.line2image.inference,
            #      description="useful when you want to generate a new real image from both the user desciption and a straight line image. like: generate a real image of a object or something from this straight line image, or generate a new real image of a object or something from this straight lines. "
            #                  "The input to this tool should be a comma seperated string of two, representing the image_path and the user description. "),
            # Tool(name="Hed Detection On Image", func=self.image2hed.inference,
            #      description="useful when you want to detect the soft hed boundary of the image. like: detect the soft hed boundary of this image, or hed boundary detection on image, or peform hed boundary detection on this image, or detect soft hed boundary image of this image. "
            #                  "The input to this tool should be a string, representing the image_path"),
            # Tool(name="Generate Image Condition On Soft Hed Boundary Image", func=self.hed2image.inference,
            #      description="useful when you want to generate a new real image from both the user desciption and a soft hed boundary image. like: generate a real image of a object or something from this soft hed boundary image, or generate a new real image of a object or something from this hed boundary. "
            #                  "The input to this tool should be a comma seperated string of two, representing the image_path and the user description"),
            # Tool(name="Segmentation On Image", func=self.image2seg.inference,
            #      description="useful when you want to detect segmentations of the image. like: segment this image, or generate segmentations on this image, or peform segmentation on this image. "
            #                  "The input to this tool should be a string, representing the image_path"),
            # Tool(name="Generate Image Condition On Segmentations", func=self.seg2image.inference,
            #      description="useful when you want to generate a new real image from both the user desciption and segmentations. like: generate a real image of a object or something from this segmentation image, or generate a new real image of a object or something from these segmentations. "
            #                  "The input to this tool should be a comma seperated string of two, representing the image_path and the user description"),
            # Tool(name="Predict Depth On Image", func=self.image2depth.inference,
            #      description="useful when you want to detect depth of the image. like: generate the depth from this image, or detect the depth map on this image, or predict the depth for this image. "
            #                  "The input to this tool should be a string, representing the image_path"),
            # Tool(name="Generate Image Condition On Depth",  func=self.depth2image.inference,
            #      description="useful when you want to generate a new real image from both the user desciption and depth image. like: generate a real image of a object or something from this depth image, or generate a new real image of a object or something from the depth map. "
            #                  "The input to this tool should be a comma seperated string of two, representing the image_path and the user description"),
            # Tool(name="Predict Normal Map On Image", func=self.image2normal.inference,
            #      description="useful when you want to detect norm map of the image. like: generate normal map from this image, or predict normal map of this image. "
            #                  "The input to this tool should be a string, representing the image_path"),
            # Tool(name="Generate Image Condition On Normal Map", func=self.normal2image.inference,
            #      description="useful when you want to generate a new real image from both the user desciption and normal map. like: generate a real image of a object or something from this normal map, or generate a new real image of a object or something from the normal map. "
            #                  "The input to this tool should be a comma seperated string of two, representing the image_path and the user description"),
            # Tool(name="Sketch Detection On Image", func=self.image2scribble.inference,
            #      description="useful when you want to generate a scribble of the image. like: generate a scribble of this image, or generate a sketch from this image, detect the sketch from this image. "
            #                  "The input to this tool should be a string, representing the image_path"),
            # Tool(name="Generate Image Condition On Sketch Image", func=self.scribble2image.inference,
            #      description="useful when you want to generate a new real image from both the user desciption and a scribble image or a sketch image. "
            #                  "The input to this tool should be a comma seperated string of two, representing the image_path and the user description"),
            # Tool(name="Pose Detection On Image", func=self.image2pose.inference,
            #      description="useful when you want to detect the human pose of the image. like: generate human poses of this image, or generate a pose image from this image. "
            #                  "The input to this tool should be a string, representing the image_path"),
            # Tool(name="Generate Image Condition On Pose Image", func=self.pose2image.inference,
            #      description="useful when you want to generate a new real image from both the user desciption and a human pose image. like: generate a real image of a human from this human pose image, or generate a new real image of a human from this pose. "
            #                  "The input to this tool should be a comma seperated string of two, representing the image_path and the user description")
            ]

```
这里我使用了三个模型：`t2i`,`ImageEditing`和`pix2pix`，用来使ChatGPT能够理解图片、编辑图片以及更改图片风格。这三个模型占用了本地接近18G的显存：
```shell
➜  image git:(main) ✗ nvidia-smi                                                               (base)
Sun Mar 12 09:31:40 2023
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 525.85.12    Driver Version: 525.85.12    CUDA Version: 12.0     |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|                               |                      |               MIG M. |
|===============================+======================+======================|
|   0  Tesla P40           On   | 00000000:01:00.0 Off |                    0 |
| N/A   73C    P0    55W / 250W |  17944MiB / 23040MiB |      0%      Default |
|                               |                      |                  N/A |
+-------------------------------+----------------------+----------------------+
 
+-----------------------------------------------------------------------------+
| Processes:                                                                  |
|  GPU   GI   CI        PID   Type   Process name                  GPU Memory |
|        ID   ID                                                   Usage      |
|=============================================================================|
|    0   N/A  N/A      1340      G   /usr/lib/xorg/Xorg                 38MiB |
|    0   N/A  N/A   1332000      C   python3                         17904MiB |
+-----------------------------------------------------------------------------+
```

而且这些本地模型也都不小，整个visual chatGPT占用了43G的硬盘空间。

### 使用效果
visual chatGPT似乎对中文支持得并不好：
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230312095903.png)
如果换成英文输入，输出才正确：
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230312100027.png)

![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230312100051.png)

![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230312100111.png)

替换的猫猫图片有点假，其他的质量都很不错。
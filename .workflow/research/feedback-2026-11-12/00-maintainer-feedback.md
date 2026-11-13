# Maintainer feedback 2026-11-12 (on main @ 97284e9cf, installed build of OhPiChamber)

Screenshots dir (absolute): /home/shizuku/.omp/agent/sessions/-Project-ohpichamber/2026-11-05T05-15-23-885Z_01a1aa22-196d-7067-87ff-720a5f864276/local/
Image map (read them with the read tool by absolute path):
#1 pasted-image-9d19cca54154c44d.png  #24 pasted-image-366a89f462e6d1c3.png  (permissions under yolo)
#2 pasted-image-6b461b4fde18f474.png  #3 pasted-image-a7dfbd4abafec0bc.png  #4 pasted-image-45210f529fba6966.png (integrations marketplace)
#5 pasted-image-4694fedd2ab1ddca.png  #6 pasted-image-8b35758c34ce86c8.png  #7 pasted-image-5cd0af44053236a7.png (settings page title; #7 = upstream 2.7.0)
#8 pasted-image-668a0bf1af764cd8.png  #9 pasted-image-999f15fe768df67b.png (missing option vs 2.7.0)
#10 pasted-image-7aa0b39019e86038.png #11 pasted-image-b81b01c85f0c3708.png #12 pasted-image-f9fb61ee40a21c67.png (model selector / sessions page / small model)
#13 pasted-image-715e33e73542d818.png #14 pasted-image-ccd63a90dafcde9d.png (usage page, chat usage)
#15 pasted-image-1336e03d2aecd22e.png (remote instances)
#16 pasted-image-1b5a7cac1e4b0f56.png (description overflow, Git prefs)
#17 pasted-image-5ab2442273aaa839.png (compaction: 词元, -1)
#18-#22 pasted-image-9e2615e0dea111fb.png pasted-image-6e5517ce35168729.png pasted-image-1e511aff88cdfdc7.png pasted-image-b16d230995566b62.png pasted-image-39a40a785e813034.png (OMP settings page)
#23 pasted-image-b50aa99f16213926.png (OpenChamber tools section)
#25 pasted-image-a97d1c3ffa88e44f.png (agent tool permission checkbox grid)
#26 pasted-image-a574e042e49d133.png (OMP plugins page)

## Verbatim (Chinese)
1. 权限系统还是有问题 即使开了yolo 有时还是会出现拒绝或者让我审批的情况 [#1] 特别是code mode 也就是eval的使用 [#24]
2. 集成市场仍然无法安装 [#2] 但会装作假安装 实际上根本看不见 [#3][#4]
3. 部分设置页的页面标题不见了 比如远程通道 [#5][#6] 原版是 [#7] 有这个标题
4. 少了个选项 [#9][#8] 对比的是原版2.7.0的构建
5. 原版在模型选框加载的时候还有个这个 [#10] 咱们的没有; 刚点击会话设置页时模型选框控件会跳变一下加载; 为什么会话这里要有默认智能体选择 omp没有这种东西 [#11]; 选择小模型 [#12] 出现了两个选择小模型; 改动导读的描述 不应该收起来放小标hover里吗 描述外溢的情况还有很多 统一一下
6. 每次点进"集成"设置页 右下角就会有一个报错
7. 用量页不行 原版也不好 [#13]: 默认只显示已添加的供应商信息, 未添加的套餐不显示; 可按添加的供应商(包括自定义供应商)看用量/统计, 也可看全部统计并给出供应商间对比. 对话页的用量也有问题 [#14]
8. 远程实例 [#15]: 本机不应当成远程实例设备, 原版也不是这么做的
9. 描述外溢 [#16]
10. 备用搜索提供商明显有更好的呈现方式 优化
11. [#17] 不用"词元"表述token; -1 应表示为 默认/自动
12. OMP设置页 [#18-#22] 不够: TUI 设置页有多少设置项都可以做进来, 但不能生搬硬套 TUI 排布, 要自然融入. 另: 移植混合混乱 — OpenChamber 的功能/设置做进来了, 但有没有用、怎么实现的是大问题. 例如 OpenChamber 工具里有"智能体图像工具"[#23] 但 OMP 本来就有图像生成. 现在一些功能是否空壳, 没接入 OMP. OMP 设置项的归属和排布, 怎么跟 OpenChamber 原有设置页融合/接入/重新定义 (例如会话设置页).
   问题: OMP 里多少功能由 TUI 实现, 多少由 SDK/后端实现? 例如 标题生成, recap 生成, 自动建议生成 等, 是 TUI 实现还是 OMP 返回而 TUI 只负责渲染?
13. 智能体工具权限 [#25] 界面太干燥 看着头疼 配置恼人
14. OMP 插件 [#26] 界面太干巴 不好看
15. 对话框下一句建议/自动建议 出来太慢 (相比 OMP TUI)
16. 新对话启动有将近一秒卡顿; 首字慢; 思考/工具调用/正文的流式很差, 没有逐字吐出的感觉, 成段蹦或一次全出
17. eval (code mode) 工具显示不直观: 参考 OMP TUI 对 eval 的做法, 显示全部内容, 直观展示当前处在 eval 哪一步/工具执行过程, 并给出输出

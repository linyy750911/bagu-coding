"""
课件: 课件模板（模板，老师自定义）(COURSE_TEMPLATE.py)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
拓扑图:
  输入: skeleton字典(17关键点)
  输出: CourseStep → 面板机 UI

  状态流转:
    环节0(启动) → 环节1(检测) → 环节2(完成)

  核心检测:
    举手检测: left_wrist.y < left_shoulder.y

修改风险点:
  ⚠️ course_id 必须唯一且与数据库配置一致 — 重复会导致加载混乱
  ⚠️ on_frame() 禁止阻塞(>50ms) — 阻塞会导致掉帧
  ⚠️ CourseStep 字段必须给默认值 — 否则序列化报错
  ⚠️ 关键点名称必须拼写正确

最近修改:
  2026-05-10: 新增拓扑图头，标注数据流向和修改风险点
  2026-05-12: 按 AI 优先版 Code Bagu 规范化八股框架（补全起股/对偶标记/入手/返回类型）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

# 破题：此模块提供课件核心教学逻辑，驱动环节状态机与动作检测；不处理面板机 UI 渲染与网络通信。
# 承题：依赖 CoursePlugin 基类及 CourseStep/CourseQuestion 数据结构，通过 skeleton 字典获取 17 关键点坐标。

from core.course_plugin import CoursePlugin, CourseStep, CourseQuestion


class MyCourse(CoursePlugin):
    # ======== 必填 ========
    course_id = "my_course"          # 唯一ID，与卡片库配置一致
    name = "我的课件"                 # 显示名称
    target_ages = "primary"          # primary=小学 / middle=中学

    # ======== 可选状态 ========
    # 在这里定义你的课程需要的变量
    # self.stage_index  —— 当前环节（0, 1, 2, ...），老师自行管理
    # self.skeleton       —— 每帧自动更新：{keypoint_name: {"x": int, "y": int, "visibility": float}}
    # self.person         —— Person 对象（有人时为真）

    # 破题：初始化课程状态变量，不执行业务逻辑；不做姿态检测也不启动帧循环。
    # 承题：调用父类 CoursePlugin.__init__()，随后设置 _step/_done 等初始状态。
    # [起讲] 将课程置于"未开始"状态，准备接收首帧驱动。
    # 入手：N/A
    def __init__(self):
        # ==== 起股 ====
        # 取：N/A
        # 验：N/A
        # ==== 中股 ====
        # 算：将内部状态归零
        # 转：无转换
        # ==== 后股 ====
        # ✓ 正路径：成员变量初始化完成
        # ✗ 降级路径：N/A（构造不可能失败）
        # ==== 束股 ====
        # 给出：无返回值
        # 留下：self._step=0, self._done=False
        super().__init__()
        self._step = 0
        self._done = False

    # 破题：返回课程启动的第一步 CourseStep；不在首帧执行逐帧逻辑。
    # 承题：依赖 CourseStep 数据类，由框架在课程激活时调用一次。
    # [起讲] 将阶段归零并构造初始欢迎界面，展示环节名称和引导语。
    # 入手：N/A
    def on_start(self) -> CourseStep:
        # ==== 起股 ====
        # 取：N/A
        # 验：N/A
        # ==== 中股 ====
        # 算：设置 _step=0, _done=False
        # 转：打包为 CourseStep 结构体
        # ==== 后股 ====
        # ✓ 正路径：返回初始 CourseStep
        # ✗ 降级路径：N/A
        # ==== 束股 ====
        # 给出：CourseStep 实例
        # 留下：self._step=0, self._done=False
        self._step = 0
        self._done = False
        return CourseStep(
            stage="环节 1",
            instruction="欢迎来到我的课件！请看摄像头。",
            tts="欢迎来到我的课件",
            show_skeleton=True,
            progress=0.0,
        )

    # 破题：每帧骨架更新时被调用，返回 CourseStep 或 None；不做阻塞操作也不发 TTS。
    # 承题：依赖 self.skeleton 提供的 17 关键点坐标，通过 kp_y/kp_visible 等辅助方法访问。
    # [起讲] 以举手检测为例：比较左右手腕与肩的 Y 坐标，腕高肩低则判为举手。
    # 入手：N/A
    def on_frame(self) -> CourseStep | None:
        # ==== 起股 ====
        # 取：self.skeleton（关键点字典）
        # 验：检查关键点坐标是否为 None
        # ==== 中股 ====
        # 算：比较 left_wrist.y 与 left_shoulder.y
        # 转：将判定结果转为 CourseStep
        # ==== 后股 ====
        # ✓ 正路径：检测到举手 → 返回完成 CourseStep
        # ✗ 降级路径：未检测到 → 返回 None（保持上一帧 UI）
        # ==== 束股 ====
        # 给出：CourseStep | None
        # 留下：self._done 可能被设为 True
        lw_y = self.kp_y("left_wrist")
        ls_y = self.kp_y("left_shoulder")
        if lw_y is not None and ls_y is not None and lw_y < ls_y:
            self._done = True
            return CourseStep(
                feedback="✓ 我看到你举手了！",
                highlight_kps=["left_wrist", "left_elbow", "left_shoulder"],
                tts="我看到你举手了",
                progress=1.0,
                finished=True,
            )
        return None

    # 破题：处理学生答题选择，返回正误反馈 CourseStep；不做多轮答题也不判分统计。
    # 承题：依赖 CourseQuestion 定义的选项索引映射，selected 为 0(A)/1(B)/2(C)。
    # [起讲] 比较学生选择与正确答案索引，匹配则返回正向反馈并标记完成。
    # 入手：N/A
    def on_answer(self, selected: int) -> CourseStep | None:
        # ==== 起股 ====
        # 取：selected (学生选择的选项索引)
        # 验：N/A
        # ==== 中股 ====
        # 算：selected == 0 判定正误
        # 转：构造反馈 CourseStep
        # ==== 后股 ====
        # ✓ 正路径：答对 → finished=True
        # ✗ 降级路径：答错 → 提示再试
        # ==== 束股 ====
        # 给出：CourseStep（反馈信息）
        # 留下：无副作用
        if selected == 0:
            return CourseStep(
                feedback="✓ 答对了！",
                tts="答对了",
                finished=True,
            )
        return CourseStep(
            feedback="再想想～",
            tts="再想想",
        )

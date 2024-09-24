const createScene = async (engine) => {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0, 0, 0);

    // 创建相机
    const camera = new BABYLON.ArcRotateCamera(
        "Camera",
        Math.PI / 4,
        Math.PI / 3,
        8,
        BABYLON.Vector3.Zero(),
        scene
    );
    camera.attachControl(canvas, true);

    // 创建光源
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);

    // 创建一个 3D 平面来承载 GUI
    const guiPlane = BABYLON.MeshBuilder.CreatePlane("guiPlane", { width: 2, height: 4 }, scene);
    guiPlane.position = new BABYLON.Vector3(2, 0.5, 0);
    guiPlane.rotation = new BABYLON.Vector3(0, Math.PI, 0);

    // 创建 GUI 并将其应用到 3D 平面
    const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(guiPlane);

    // 主面板
    const mainPanel = new BABYLON.GUI.StackPanel();
    mainPanel.width = "100%";
    mainPanel.height = "100%";
    mainPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    mainPanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    advancedTexture.addControl(mainPanel);

    // 文件选择器菜单面板
    const filePanel = new BABYLON.GUI.StackPanel();
    filePanel.width = "100%";
    filePanel.height = "50%";
    filePanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    filePanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    filePanel.background = "rgba(255, 255, 255, 0.8)"; // 半透明白色背景
    filePanel.border = "2px solid #ccc"; // 边框
    filePanel.cornerRadius = 10; // 圆角
    filePanel.isVertical = true; // 使文件面板支持垂直滚动
    mainPanel.addControl(filePanel);

    // 滑动条面板
    const sliderPanel = new BABYLON.GUI.StackPanel();
    sliderPanel.width = "100%";
    sliderPanel.height = "50%";
    sliderPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    sliderPanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    sliderPanel.paddingTop = "10px";
    mainPanel.addControl(sliderPanel);

    // 添加滑动条的创建函数
    const createSlider = (height, topPadding = "0px") => {
        const slider = new BABYLON.GUI.Slider();
        slider.height = height;
        slider.width = "100%";
        slider.paddingTop = topPadding;
        slider.color = "green";
        sliderPanel.addControl(slider);
        return slider;
    };

    // 创建两个滑动条
    const slider1 = createSlider("20px");
    const slider2 = createSlider("30px", "10px");

    // 创建剪切平面的可视化
    const createPlaneVisual = (name, color, position, rotation) => {
        const planeMesh = BABYLON.MeshBuilder.CreatePlane(name, { size: 3 }, scene);
        planeMesh.rotation = rotation;
        planeMesh.position = position;
        planeMesh.material = new BABYLON.StandardMaterial(`${name}Material`, scene);
        planeMesh.material.diffuseColor = color;
        planeMesh.material.alpha = 0.5;
        return planeMesh;
    };

    // 用于存储当前加载的模型和相关资源
    let currentModel = null;
    let clipPlanes = [];
    let planeVisual1, planeVisual2;

    // 加载模型
    const loadModel = (fileName) => {
        if (currentModel) {
            currentModel.dispose();
            planeVisual1.dispose();
            planeVisual2.dispose();
        }

        // 创建新的剪切平面和可视化平面
        clipPlanes = [
            new BABYLON.Plane(0, 1, 0, 0), // 红色平面
            new BABYLON.Plane(1, 0, 0, 0)  // 绿色平面
        ];
        planeVisual1 = createPlaneVisual(
            "clipPlaneVisual1",
            new BABYLON.Color3(1, 0, 0),
            BABYLON.Vector3.Zero(),
            new BABYLON.Vector3(Math.PI / 2, 0, 0)
        );
        planeVisual2 = createPlaneVisual(
            "clipPlaneVisual2",
            new BABYLON.Color3(0, 1, 0),
            BABYLON.Vector3.Zero(),
            new BABYLON.Vector3(0, Math.PI / 2, 0)
        );

        // 加载新模型
        BABYLON.SceneLoader.ImportMesh("", "https://robertxr.github.io/MedicalModelDisplay-WebXR/models/", fileName, scene, (newMeshes) => {
            currentModel = newMeshes[0];

            // 创建并应用材质
            const modelMaterial = new BABYLON.StandardMaterial("modelMaterial", scene);
            modelMaterial.backFaceCulling = false;
            modelMaterial.clipPlane = clipPlanes[0];
            modelMaterial.clipPlane2 = clipPlanes[1];
            currentModel.material = modelMaterial;

            // 更新可视化平面位置
            const updatePlaneVisual = (planeMesh, plane) => {
                planeMesh.position = plane.normal.scale(-plane.d);
                planeMesh.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(
                    Math.atan2(-plane.normal.y, plane.normal.z),
                    Math.atan2(plane.normal.x, plane.normal.z),
                    Math.atan2(plane.normal.x, plane.normal.y)
                );
            };

            updatePlaneVisual(planeVisual1, clipPlanes[0]);
            updatePlaneVisual(planeVisual2, clipPlanes[1]);

            // 获取模型边界信息并设置滑动条
            const boundingInfo = currentModel.getBoundingInfo();
            const min = boundingInfo.minimum;
            const max = boundingInfo.maximum;
            const centerY = (max.y + min.y) / 2;
            const centerX = (max.x + min.x) / 2;

            // 设置滑动条的范围和初始值
            slider1.minimum = min.y;
            slider1.maximum = max.y;
            slider1.value = centerY;
            slider2.minimum = min.x;
            slider2.maximum = max.x;
            slider2.value = centerX;

            slider1.onValueChangedObservable.clear();
            slider1.onValueChangedObservable.add((value) => {
                clipPlanes[0].d = value;
                updatePlaneVisual(planeVisual1, clipPlanes[0]);
                modelMaterial.clipPlane = clipPlanes[0];
                console.log("Slider1 value changed:", value);
            });

            slider2.onValueChangedObservable.clear();
            slider2.onValueChangedObservable.add((value) => {
                clipPlanes[1].d = value;
                updatePlaneVisual(planeVisual2, clipPlanes[1]);
                modelMaterial.clipPlane2 = clipPlanes[1];
                console.log("Slider2 value changed:", value);
            });
        });
    };

    // 加载可用模型并填充文件选择器
    const loadAvailableModels = async () => {
        try {
            const response = await fetch('https://robertxr.github.io/MedicalModelDisplay-WebXR/models/modelList.json');
            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.statusText}`);
            }

            const files = await response.json();
            const maxFilesToShow = 4;
            const fileList = files.filter(file => file.endsWith('.obj'));

            filePanel.clearControls();
            fileList.slice(0, maxFilesToShow).forEach(file => {
                const button = BABYLON.GUI.Button.CreateSimpleButton(file, file);
                button.width = "350px";
                button.height = "80px";
                button.color = "white";
                button.background = "#007bff";
                button.cornerRadius = 5;
                button.thickness = 1;
                button.borderColor = "#0056b3";
                button.fontSize = 20;
                button.onPointerClickObservable.add(() => loadModel(file));
                filePanel.addControl(button);
            });

            if (fileList.length > maxFilesToShow) {
                filePanel.isVertical = true;
                filePanel.height = "auto";
                filePanel.maxHeight = "500px";
            } else {
                filePanel.isVertical = false;
                filePanel.height = `${fileList.length * 80}px`;
            }
        } catch (error) {
            console.error("Failed to load models:", error);
        }
    };

    await loadAvailableModels();

    // 创建 XR 体验
    const xrHelper = await scene.createDefaultXRExperienceAsync();
    const featuresManager = xrHelper.baseExperience.featuresManager;

    // 启用控制器选择功能
    featuresManager.enableFeature(BABYLON.WebXRFeatureName.POINTER_SELECTION, "stable", {
        xrInput: xrHelper.input,
        enablePointerSelectionOnAllControllers: true,
    });

    // 设置激光光标（在控制器上显示指向线）
    const pointerSelection = featuresManager.getEnabledFeature(BABYLON.WebXRFeatureName.POINTER_SELECTION);
    pointerSelection.displayLaserPointer = true; // 显示激光笔
    pointerSelection.displaySelectionMesh = false; // 取消显示选择光圈

    // 创建传送地面
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
    ground.position.y = -1.5;

    // 启用传送功能
    featuresManager.enableFeature(BABYLON.WebXRFeatureName.TELEPORTATION, "stable", {
        xrInput: xrHelper.input,
        floorMeshes: [ground],
    });

    return scene;
};

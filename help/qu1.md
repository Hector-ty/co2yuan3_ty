# DashboardPage.jsx解耦计划

 创建大脑 `useCarbonData.js`：

1. - 将 `DashboardPage.jsx` 中所有关于 `submittedData`, `allSubmittedData`, `loadingData`, `error`, `success` 的 `useState` 剪切过去。
   
   - 将 `refetchAllData`, `handleSearch`, `handleDelete`, `handleSaveEdit`, `handleFormSubmit`, `handleExport` 这些函数剪切过去。
   
   - 将所有 `axios` 请求（增删改查）都搬到这个Hook里。
   
   - 最后，`return` 出所有状态和方法，供外部使用。

2. **创建地区专家 `useRegions.js`**：
   
   - `DashboardPage.jsx` 和 `LoginPage.jsx` 都用到了获取地区的功能。我们可以把它抽成一个可复用的Hook！
   
   - 将获取 `regions` 的 `useState` 和 `useEffect` 搬进去。
   
   - `return { regions, loading, error }`。

3. **拆分UI部落：**
   
   - **`SearchBar.jsx`**：新建这个组件，把 `HistoricalDataTable` 里的搜索框（`TextField`, `Select`, `Button`）的JSX和相关状态（`searchYear`, `searchRegion`）放进去。它通过 props 回调 (`onSearch`) 通知父组件执行搜索。
   
   - **`HistoricalDataTable.jsx`**：负责渲染 `TableContainer`。它从 props 接收 `data`。它自己管理表格的交互状态，比如 `expandedRowKeys` 和 `editingRowKey`。
   
   - **`TableRowDetail.jsx`**：表格展开后看到的那一坨详情（包括分类排放和编辑按钮），可以抽成这个组件，接收 `record`作为 props。
   
   - **`ChartAnalysis.jsx`**：将整个“图表分析”的 `MotionBox` 剪切过来。它接收 `selectedRecord` 和 `allData` 作为 props，自己内部管理对比模式 (`compareMode`) 和对比数据 (`comparisonData`) 的状态和逻辑。
   
   - **`DataEntryTab.jsx`**：一个简单的包装组件，负责渲染第一个Tab里的 `DataEntryForm`。

4. **重组指挥官 `DashboardPage.jsx`**：
   
   - 删除所有被移走的状态和函数。
   
   - 在组件顶部调用 `const { ... } = useCarbonData();` 和 `const { regions } = useRegions();`。
   
   - 管理页面级状态：`activeTab` 和 `selectedRecord`。
   
   - `return` 的JSX现在变得非常清晰：一个 `AppBar`，一个 `Tabs`，然后根据 `activeTab` 来决定渲染 `DataEntryTab` 还是 `HistoricalDataTable` + `ChartAnalysis` 的组合。
   
   - 像搭积木一样，把数据和回调函数通过 `props` 传递给各个子组件。
   
   # DataScreenPage.jsx解耦计划
   
   1. **创建数据专家 `useDataScreen.js`**：
      
      - 把 `DataScreenPage.jsx` 里的所有 `useState` 和整个 `useEffect` 都剪切过去。
      
      - 在Hook内部完成 `axios` 请求、数据排序、计算、转换格式等所有脏活累活。
      
      - 最后 `return { data, loading, error }`，其中 `data` 是一个包含了所有处理好的图表数据的对象，例如 `{ cardData, donutData, ... }`。
   
   2. **拆分UI部落：**
      
      - **`StatCardsGrid.jsx`**：新建组件，把顶部的四个 `DataCard` 的 `Grid` 容器和 `Grid item` 剪切过来。它接收 `cardData` 作为 props。
      
      - **`ChartsGrid.jsx`**：新建组件，把下面所有图表的 `Grid` 容器和 `Grid item` 剪切过来。它接收所有图表数据作为 props。
   
   3. **重组画廊馆长 `DataScreenPage.jsx`**：
      
      - 调用 `useDataScreen()` 获取数据。
      
      - 处理 `loading` 和 `error` 状态。
      
      - 清爽地渲染 `<StatCardsGrid data={data.cardData} />` 和 `<ChartsGrid charts={data} />`。 
      
      # LoginPage.jsx解耦计划
      
      **分步行动指南：**
      
      1. **创建 `LoginForm.jsx`**：
         
         - 将 `LoginPage.jsx` 中登录相关的状态 (`account`, `password`)、`handleSubmit` 函数和登录表单的JSX剪切过来。
         
         - 接收 `onLogin` 和 `onSwitchToRegister` 作为 props。
      
      2. **创建 `RegistrationForm.jsx`**：
         
         - 将注册相关的状态 (`email`, `password`, `unitName`, `region`, `open`)、`handleRegister` 函数和注册表单的JSX剪切过来。
         
         - **额外加分项**：那个复杂的地区选择 `<Select>` 逻辑可以再抽成一个 **`RegionSelector.jsx`** 组件！它接收 `value` 和 `onChange`，内部管理地区的展开/折叠。这样 `RegistrationForm` 会更干净！
         
         - `RegistrationForm` 调用 `useRegions()` 来获取地区数据。
         
         - 接收 `onRegister` 和 `onSwitchToLogin` 作为 props。
      
      3. **重组调度员 `LoginPage.jsx`**：
         
         - 只保留一个核心状态：`const [isLogin, setIsLogin] = useState(true);`。
         
         - 在 `return` 中，根据 `isLogin` 的值，来决定渲染 `<LoginForm />` 还是 `<RegistrationForm />`，并把对应的回调函数传给它们。

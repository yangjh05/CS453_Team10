function selectorWorkspace({ domain, data }) {
  const [workspace, setWorkspace] = useState(null); // 워크스페이스 상태로 관리
  const [selectedKey, setSelectedKey] = useState(null);
  const [selectors, setSelectors] = useState([]);
  const [isEditingKey, setIsEditingKey] = useState(false); // Edit mode
  const [editKeyValue, setEditKeyValue] = useState("");

  const addBlockToWorkspace = (key, selector) => {
    if (workspace) {
      // 기존에 선택된 키가 있으면 그 키의 workspace 코드를 저장
      if (selectedKey && selectedKey != "") {
        const updatedCode = javascriptGenerator
          .workspaceToCode(workspace)
          .replace(/;(?=\s*$)/gm, "");
        setSelectors((prevSelectors) => ({
          ...prevSelectors,
          [selectedKey]: updatedCode,
        }));
      }

      // 현재 선택된 키를 새로운 키로 변경
      setSelectedKey(key);

      // 워크스페이스를 클리어
      workspace.clear();

      // 새롭게 선택된 키에 대한 XML 블록 생성
      const xmlTextNew = generateBlocklyXmlFromTree(parseXPath(selector));

      // DOMParser로 XML 문자열을 DOM 객체로 변환
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        xmlTextNew,
        "text/xml"
      ).documentElement;

      // DOM 객체를 워크스페이스에 추가
      Blockly.Xml.domToWorkspace(dom, workspace);
    }
  };

  useEffect(() => {
    defineCustomBlocks();

    if (blocklyDiv.current) {
      const newWorkspace = Blockly.inject(blocklyDiv.current, {
        toolbox: toolboxConfiguration,
        scrollbars: true,
        trashcan: true,
      });
      setWorkspace(newWorkspace);
      return () => newWorkspace.dispose(); // 컴포넌트 언마운트 시 워크스페이스 정리
    }
  }, []);
}

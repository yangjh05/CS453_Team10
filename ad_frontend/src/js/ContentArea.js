import React, { useState, useEffect, useRef } from "react";
import "../css/ContentArea.css";
import * as Blockly from "blockly";
import "blockly/blocks";
import { javascriptGenerator } from "blockly/javascript";
import {
  javascriptGenerator as pythonGenerator,
  generateFlowXml,
  generateJsonFromXml,
  createToolboxConfiguration,
  defineBlocks,
} from "./configs/@blocklyConfigs/flowConfigs.js";
import parseXPath from "./utils/@blocklyUtils/selectors/parseXtree.js";
import generateBlocklyXmlFromTree from "./utils/@blocklyUtils/selectors/generateXml.js";
import {
  toolboxConfiguration,
  defineCustomBlocks,
} from "./configs/@blocklyConfigs/selectorConfigs.js";
import Pagination from "./utils/Pagination.js";

function ContentArea({ domain }) {
  const [mainLink, setMainLink] = useState("");

  const [workspace, setWorkspace] = useState(null); // 워크스페이스 상태로 관리
  const workspace2Ref = useRef(null);
  const blocklyDiv = useRef(null);
  const blocklyDiv2 = useRef(null);
  const [generatedCode, setGeneratedCode] = useState("");

  const [data, setData] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [selectors, setSelectors] = useState([]);
  const [isEditingKey, setIsEditingKey] = useState(false); // Edit mode
  const [editKeyValue, setEditKeyValue] = useState("");

  const [pageNum, setPageNum] = useState(1);

  // ------------------------ Fetch JSON Data----------------------------

  const handlePageChange = (page) => {
    setPageNum(page);
  }

  useEffect(() => {
    // 첫 로딩 시 실행할 코드
    const fetchData = async () => {
      const url = "http://localhost:5000/api/send_info";
      const requestData = { domain: domain }; // 서버로 전송할 데이터

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData), // JSON 데이터를 문자열로 변환
        });

        if (response.ok) {
          const responseData = await response.json();
          setData(responseData); // 받아온 데이터 상태에 저장
          console.log("Response Data:", responseData);

          setMainLink(responseData.urls.base_url);
          setSelectors(responseData.selectors);
        } else {
          console.error("Request failed:", response.statusText);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchData();
  }, []); // 빈 배열이므로 첫 로딩에만 실행

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

  //--------------------------Blockly Configuration-------------------------

  useEffect(() => {
    if(pageNum !== 2) return;
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
  }, [pageNum]);

  const reloadWorkspace2 = (data) => {
    if (data) {
      if (workspace2Ref.current) {
        workspace2Ref.current.dispose();
      }

      const newToolBoxConfiguration = createToolboxConfiguration(data);
      defineBlocks(data);
      //registerDynamicGenerators(data);

      if (blocklyDiv2.current && newToolBoxConfiguration) {
        // 워크스페이스 초기화
        const newWorkspace = Blockly.inject(blocklyDiv2.current, {
          toolbox: newToolBoxConfiguration,
          scrollbars: true,
          trashcan: true,
        });
        workspace2Ref.current = newWorkspace; // Ref에 직접 저장
        console.log("Workspace2 initialized");

        if (data) {
          console.log("Workspace2 initialized, applying data immediately.");
          const xmlText = generateFlowXml(data);

          const parser = new DOMParser();
          const xmlDom = parser.parseFromString(
            xmlText,
            "text/xml"
          ).documentElement;

          if (xmlDom.nodeName !== "parsererror") {
            newWorkspace.clear();
            Blockly.Xml.domToWorkspace(xmlDom, newWorkspace);
          } else {
            console.error("Invalid XML:", xmlDom.textContent);
          }
        }

        return () => {
          console.log("Disposing Workspace2.");
          newWorkspace.dispose();
        };
      }
    }
  };

  useEffect(() => {
    if(pageNum !== 3) return;
    reloadWorkspace2(data);
  }, [data, blocklyDiv2, pageNum]);

  const generateCode = async () => {
    if (workspace) {
      if (selectedKey && selectedKey !== "") {
        const updatedCode = javascriptGenerator
          .workspaceToCode(workspace)
          .replace(/;(?=\s*$)/gm, "");
        const newSelectors = { ...selectors, [selectedKey]: updatedCode };

        // 상태 업데이트 후 API 요청을 보냄
        setSelectors(newSelectors); // 상태 업데이트
        const code = javascriptGenerator.workspaceToCode(workspace);
        setGeneratedCode(code);

        const url = "http://localhost:5000/api/edit_selectors";
        const data = {
          domain: domain,
          selectors: newSelectors, // 바로 업데이트된 selectors 사용
        };

        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data), // JSON 데이터를 문자열로 변환
          });

          if (response.ok) {
            const responseData = await response.json();
            console.log("Response Data:", responseData);
            setData(responseData.data);
            reloadWorkspace2(responseData.data);
          } else {
            console.error("Request failed:", response.statusText);
          }
        } catch (error) {
          console.error("Error:", error);
        }
      } else {
        const code = javascriptGenerator.workspaceToCode(workspace);
        setGeneratedCode(code);
        const url = "http://localhost:5000/api/edit_selectors";
        const data = {
          domain: domain,
          selectors: selectors, // 기존 selectors 그대로 사용
        };

        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data), // JSON 데이터를 문자열로 변환
          });

          if (response.ok) {
            const responseData = await response.json();
            console.log("Response Data:", responseData);
            setData(responseData.data);
            reloadWorkspace2(responseData.data);
          } else {
            console.error("Request failed:", response.statusText);
          }
        } catch (error) {
          console.error("Error:", error);
        }
      }
    } else {
      console.log("Workspace is not set");
    }
  };

  const generateCode2 = async () => {
    const xmlDom = Blockly.Xml.workspaceToDom(workspace2Ref.current);

    // XML DOM을 문자열로 변환
    const xmlString = Blockly.Xml.domToPrettyText(xmlDom);

    const resJson = generateJsonFromXml(xmlString);
    console.log(resJson);

    const url = "http://localhost:5000/api/edit_method";
    const data = {
      domain: domain,
      method: resJson,
    };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data), // JSON 데이터를 문자열로 변환
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log("Response Data:", responseData);
      } else {
        console.error("Request failed:", response.statusText);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleBaseUrlInputChange = (event) => {
    setMainLink(event.target.value);
  }

  const handleEditName = () => {
    setEditKeyValue(selectedKey); // Set current key as input value
    setIsEditingKey(true); // Switch to editing mode
  };

  const handleSubmitEdit = () => {
    if (editKeyValue && editKeyValue !== selectedKey) {
      const updatedSelectors = { ...selectors };
      updatedSelectors[editKeyValue] = selectors[selectedKey];
      delete updatedSelectors[selectedKey];
      console.log(updatedSelectors);
      setSelectors(updatedSelectors);
      setSelectedKey(editKeyValue);
    }
    setIsEditingKey(false); // Exit editing mode
  };

  const handleDelete = (key) => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      const updatedSelectors = { ...selectors };
      delete updatedSelectors[key];
      console.log(updatedSelectors);
      setSelectors(updatedSelectors);

      if (key === selectedKey) {
        setSelectedKey("");
        if (workspace) workspace.clear();
      } // Clear selectedKey if deleted
    }
  };

  const handleAddComponent = () => {
    const newKey = prompt("Enter the name of the component:");
    if (newKey && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newKey)) {
      if (!selectors[newKey]) {
        setSelectors({ ...selectors, [newKey]: "" });
      } else {
        alert("This name is being used already.");
      }
    } else {
      alert("Enter a valid string with doesn't start with a number.");
    }
  };

  const editConfig = async () => {
    const url = "http://localhost:5000/api/edit";
    const data = {
      domain: domain,
      base_url: mainLink,
    };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data), // JSON 데이터를 문자열로 변환
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log("Response Data:", responseData);
      } else {
        console.error("Request failed:", response.statusText);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="content-area">
      {pageNum === 1 && (
        <div className="info-block">
          <h3>Basic Setting</h3>
          <div className="info">
            <label for="base_url">Base URL: </label>
            <input
              type="text"
              className="default-input"
              id="base_url"
              placeholder="Enter the base link"
              value={mainLink}
              onChange={handleBaseUrlInputChange}
            />
          </div>
          <div className="button-container">
            <button onClick={editConfig} className="btn save-config">
              Save
            </button>
          </div>
        </div>
      )}

      {pageNum === 2 && (
        <div className="full-screen-container">
          <div className="components">
            <div className="left">
              <div className="list-container">
                <ul
                  className="list"
                  style={{ listStyleType: "none", padding: 0 }}
                >
                  {Object.keys(selectors).map((key) => (
                    <li
                      key={key}
                      className={`list-item ${
                        selectedKey === key ? "selected" : ""
                      }`}
                      style={{
                        cursor: "pointer",
                        margin: "5px 0",
                        color: selectedKey === key ? "#0056b3" : "#007bff",
                      }}
                      onClick={() => addBlockToWorkspace(key, selectors[key])}
                    >
                      {key}
                      <button
                        className="mini-btn delete-button"
                        onClick={(e) => {
                          e.stopPropagation(); // 클릭 이벤트 전파를 막음
                          handleDelete(key); // Delete 처리
                        }}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="button-container">
                <button
                  className="btn add-component"
                  onClick={handleAddComponent}
                >
                  Add a new selector
                </button>
                <button className="btn apply-changes" onClick={generateCode}>
                  Save and apply
                </button>
              </div>
            </div>

            <div className="selectors">
              <div className="show-and-edit-selected-key">
                <h3 className="key">
                  Key Name:{" "}
                  {isEditingKey ? (
                    <input
                      type="text"
                      className="default-input"
                      value={editKeyValue}
                      onChange={(e) => setEditKeyValue(e.target.value)}
                    />
                  ) : (
                    selectedKey
                  )}
                </h3>
                {selectedKey !== null && (
                  <button
                    className={
                      isEditingKey ? "mini-btn submit" : "mini-btn edit"
                    }
                    onClick={isEditingKey ? handleSubmitEdit : handleEditName}
                  >
                    {isEditingKey ? "Save" : "Edit name"}
                  </button>
                )}
              </div>
              <div className="blockly-workspace" ref={blocklyDiv}></div>
            </div>
          </div>
        </div>
      )}

      {pageNum === 3 && (
        <div className="full-screen-container">
          <div className="flow">
            <div className="flow-workspace" ref={blocklyDiv2}></div>
          </div>
          <button className="btn generate-flow" onClick={generateCode2}>
            Generate JSON and save
          </button>
        </div>
      )}

      <Pagination
        totalPages={3}
        currentPage={pageNum}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

export default ContentArea;

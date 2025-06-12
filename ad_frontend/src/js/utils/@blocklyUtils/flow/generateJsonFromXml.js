import { typesArray } from "../../../configs/@blocklyConfigs/flowConfigs";

function generateJsonFromXml(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  
    const rootBlock = xmlDoc.querySelector("block");
    const jsonResult = parseXmlToJson(rootBlock);
    return jsonResult;
  }
  
  function parseXmlToJson(xmlNode) {
    const blocks = [];
    let currentNode = xmlNode;
  
    while (currentNode) {
      if (currentNode.nodeName === "block") {
        const blockJson = parseBlockToJson(currentNode);
  
        // 블록의 JSON을 배열에 추가
        if (blockJson) blocks.push(blockJson);
  
        // `<next>`가 있으면 다음 블록 처리
        const nextNode = currentNode.querySelector(":scope > next > block"); // 현재 블록의 next만 처리
        currentNode = nextNode;
      } else {
        currentNode = null;
      }
    }
  
    return blocks;
  }
  
  function parseBlockToJson(blockNode) {
    const type = blockNode.getAttribute("type");
    if (isFunctionBlock(type)) {
      const json = {
        type: "function",
        name: type,
        args: [],
      };
  
      console.log(blockNode.children);
      // 모든 <value> 요소를 순회하여 파싱
      const valueNodes = [...blockNode.children].filter(
        (child) => child.nodeName === "value"
      );
  
      console.log(valueNodes);
  
      valueNodes.forEach((valueNode) => {
        const blockChild = valueNode.querySelector("block");
        if (blockChild) {
          const parsedValue = parseBlockArgument(blockChild);
          if (parsedValue) {
            json.args.push(parsedValue);
          }
        }
      });
      return json;
    }
    switch (type) {
      case "const":
        return parseBlockArgument(blockNode);
  
      case "if":
        return parseIfBlock(blockNode);
  
      case "for_with_cnt":
        return parseForWithCntBlock(blockNode);
  
      case "while":
        return parseWhileBlock(blockNode);
  
      case "gt":
      case "eq":
        return parseConditionBlock(blockNode);
  
      case "def":
        return parseDefBlock(blockNode);
  
      case "try_except":
        return parseTryExceptArgument(blockNode);
  
      case "pass":
      case "return":
        return {
          type: type,
        };
  
      case "dec":
        return {
          type: "dec",
          var: parseBlockArgument(
            blockNode.querySelector("value[name='VAR'] > block")
          ),
        };
  
      default:
        return parseBlockArgument(blockNode);
    }
  }
  
  function parseConditionBlock(blockNode) {
    const type = blockNode.getAttribute("type");
    const json = {
      type: type,
      arg0: null,
      arg1: null,
    };
  
    // arg0 파싱
    const arg0Node = blockNode.querySelector("value[name='A'] > block");
    if (arg0Node) {
      json.arg0 = parseBlockToJson(arg0Node);
    }
  
    // arg1 파싱
    const arg1Node = blockNode.querySelector("value[name='B'] > block");
    if (arg1Node) {
      json.arg1 = parseBlockToJson(arg1Node);
    }
  
    return json;
  }
  
  function parseIfBlock(blockNode) {
    const json = {
      type: "if",
      condition: null,
      body: [],
    };
  
    // 조건 부분 파싱
    const conditionNode = blockNode.querySelector(
      "value[name='CONDITION'] > block"
    );
    if (conditionNode) {
      json.condition = parseBlockToJson(conditionNode);
    }
  
    // 본문(body) 파싱
    const bodyNode = blockNode.querySelector("statement[name='DO']");
    if (bodyNode) {
      const bodyBlock = bodyNode.querySelector("block");
      json.body = parseXmlToJson(bodyBlock);
    }
  
    return json;
  }
  
  function parseForWithCntBlock(blockNode) {
    const json = {
      type: "for_with_cnt",
      var: null,
      list: null,
      body: [],
    };
  
    // 변수 (VAR) 파싱
    const varNode = blockNode.querySelector("value[name='VAR'] > block");
    if (varNode) {
      json.var = parseBlockArgument(varNode); // 변수 값 처리
    }
  
    // 배열 (ARRAY) 파싱
    const listNode = blockNode.querySelector("value[name='ARRAY'] > block");
    if (listNode) {
      json.list = parseBlockToJson(listNode); // 배열 값 처리
    }
  
    // 본문 (DO) 파싱
    const bodyNode = blockNode.querySelector("statement[name='DO']");
    if (bodyNode) {
      const bodyBlock = bodyNode.querySelector("block");
      json.body = parseXmlToJson(bodyBlock);
    }
  
    return json;
  }
  
  function parseWhileBlock(blockNode) {
    const json = {
      type: "while",
      condition: null,
      body: [],
    };
  
    // 조건 (CONDITION) 파싱
    const conditionNode = blockNode.querySelector(
      "value[name='CONDITION'] > block"
    );
    if (conditionNode) {
      json.condition = parseBlockToJson(conditionNode);
    }
  
    // 본문 (DO) 파싱
    const bodyNode = blockNode.querySelector("statement[name='DO'] > block");
    if (bodyNode) {
      json.body = parseXmlToJson(bodyNode); // <next> 체인을 재귀적으로 처리
    }
  
    return json;
  }
  
  function parseDefBlock(blockNode) {
    const json = {
      type: "def",
      name: null,
      initial: null,
    };
    const nameNode = blockNode.querySelector("field[name='NAME']");
    if (nameNode) json.name = nameNode.textContent.trim();
    const initialNode = blockNode.querySelector("value[name='VALUE'] > block");
    if (initialNode) json.initial = parseBlockToJson(initialNode);
    return json;
  }
  
  function parseTryExceptArgument(blockNode) {
    const json = {
      type: "try_except",
      try: [],
      except: [],
    };
    const tryNode = blockNode.querySelector("statement[name='TRY'] > block");
    if (tryNode) json.try = parseXmlToJson(tryNode);
    const exceptNode = blockNode.querySelector(
      "statement[name='EXCEPT'] > block"
    );
    if (exceptNode) json.except = parseXmlToJson(exceptNode);
    return json;
  }
  
  function isFunctionBlock(type) {
    return typesArray.includes(type);
  }
  
  function parseBlockArgument(blockNode) {
    const type = blockNode.getAttribute("type");
    if (type.startsWith("selectors_")) {
      return `['selectors']['${type.replace("selectors_", "")}']`;
    } else if (type.startsWith("urls_")) {
      return `['urls']['${type.replace("urls_", "")}']`;
    } else if (type.startsWith("credentials_")) {
      return `['credentials']['${type.replace("credentials_", "")}']`;
    } else if (
      type === "download_path" ||
      type === "search_text" ||
      type === "download_num"
    ) {
      return `['${type}']`;
    } else if (type === "const") {
      const fieldNode = blockNode.querySelector("field");
      return fieldNode ? fieldNode.textContent.trim() : null;
    }
    return null;
  }

export {
    generateJsonFromXml
}
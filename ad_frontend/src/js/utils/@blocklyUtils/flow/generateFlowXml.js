
function generateFlowXml(data) {
  let xml = `<xml xmlns="https://developers.google.com/blockly/xml">\n`;

  xml += createBlockXmlSequence(data.methods);

  // XML 종료
  xml += `</xml>`;
  return xml;
}
function createBlockXmlSequence(methods) {
  if (methods.length === 0) return ""; // 더 이상 블록이 없으면 종료

  // 첫 번째 블록 생성
  const currentBlock = createBlockXml(methods[0]);

  // 나머지 블록 연결
  const nextBlock = createBlockXmlSequence(methods.slice(1));

  // 현재 블록의 마지막 `</block>`를 찾아 정확히 변경
  if (nextBlock) {
    const lastClosingTagIndex = currentBlock.lastIndexOf("</block>");
    if (lastClosingTagIndex !== -1) {
      return (
        currentBlock.slice(0, lastClosingTagIndex) +
        `<next>${nextBlock}</next></block>`
      );
    }
  }

  return currentBlock; // 다음 블록이 없으면 현재 블록 그대로 반환
}

function createBlockXml(method) {
  let blockXml = "";

  const transformArg = (arg) => {
    const matches = arg.match(/\['([^']+)'\]/g); // ['???'] 패턴 모두 찾기
    if (matches) {
      // 각 ['???']에서 ??? 부분만 추출하여 연결
      return matches.map((match) => match.match(/\['([^']+)'\]/)[1]).join("_");
    }
    return arg; // 패턴이 없으면 그대로 반환
  };

  switch (method.type) {
    case "function":
      switch (method.name) {
        case "visit":
          blockXml = `
              <block type="visit">
                <value name="STRING">
                  ${createBlockXml(method.args[0])}
                </value>
              </block>
            `;
          break;

        case "click":
          blockXml = `
              <block type="click">
                <value name="STRING">
                ${createBlockXml(method.args[0])}
                </value>
              </block>
            `;
          break;

        case "enter":
          blockXml = `
              <block type="enter">
                <value name="FIELD">
                ${createBlockXml(method.args[0])}
                </value>
                <value name="VALUE">
                ${createBlockXml(method.args[1])}
                </value>
              </block>
            `;
          break;

        case "handle_alert":
          blockXml = `
                <block type="handle_alert"></block>
              `;
          break;
        case "handle_popup":
          blockXml = `
                  <block type="handle_popup"></block>
                `;
          break;

        case "switch_popup":
          blockXml = `
                    <block type="switch_popup"></block>
                  `;
          break;

          case "come_back":
          blockXml = `
                    <block type="come_back"></block>
                  `;
          break;

        case "switch_to":
          blockXml = `
              <block type="switch_to">
                <value name="STRING">
                ${createBlockXml(method.args[0])}
                </value>
              </block>
            `;
          break;

        case "check_downloaded":
          blockXml = `
              <block type="check_downloaded">
                <value name="FILES">
                ${createBlockXml(method.args[0])}
                </value>
                <value name="SIZES">
                ${createBlockXml(method.args[1])}
                </value>
                <value name="SELLER">
                ${createBlockXml(method.args[2])}
                </value>
                <value name="ITEM_NUMBER">
                ${createBlockXml(method.args[3])}
                </value>
                <value name="TITLE">
                ${createBlockXml(method.args[4])}
                </value>
                <value name="CLOSE">
                ${createBlockXml(method.args[5])}
                </value>
              </block>
            `;
          break;

        case "track_download_progress":
          blockXml = `
              <block type="track_download_progress">
                <value name="FILES">
                ${createBlockXml(method.args[0])}
                </value>
                <value name="SIZES">
                ${createBlockXml(method.args[1])}
                </value>
                <value name="SELLER">
                ${createBlockXml(method.args[2])}
                </value>
                <value name="ITEM_NUMBER">
                ${createBlockXml(method.args[3])}
                </value>
                <value name="TITLE">
                ${createBlockXml(method.args[4])}
                </value>
              </block>
            `;
          break;

        case "len":
          blockXml = `
              <block type="len">
                <value name="STRING">
                ${createBlockXml(method.args[0])}
                </value>
              </block>
            `;
          break;

        case "find":
          blockXml = `
            <block type="find">
            <value name="SELECTOR">
            ${createBlockXml(method.args[0])}
            </value>
            </block>
        `;
          break;

        case "texts_in_list":
          blockXml = `
            <block type="texts_in_list">
                <value name="LIST">
                ${createBlockXml(method.args[0])}
                </value>
            </block>
        `;
          break;

        case "find_list":
          blockXml = `
            <block type="find_list">
            <value name="SELECTOR">
            ${createBlockXml(method.args[0])}
            </value>
            </block>
        `;
          break;

        case "wait_until_list":
          blockXml = `
              <block type="wait_until_list">
              <value name="SELECTOR">
              ${createBlockXml(method.args[0])}
              </value>
              <value name="SECONDS">
              ${createBlockXml(method.args[1])}
              </value>
              </block>
          `;
          break;
        case "wait_and_click":
          blockXml = `
                <block type="wait_and_click">
                <value name="SELECTOR">
                ${createBlockXml(method.args[0])}
                </value>
                <value name="SECONDS">
                ${createBlockXml(method.args[1])}
                </value>
                </block>
            `;
          break;

        default:
          console.warn(`Unhandled function name: ${method.name}`);
          break;
      }
      break;

    case "if":
      const condition = method.condition;
      blockXml = `
          <block type="if">
            <value name="CONDITION">
              <block type="${method.condition.type}">
                <value name="A">
                    ${createBlockXml(method.condition.arg0)}  
                </value>
                <value name="B">
                    ${createBlockXml(method.condition.arg1)}
                </value>
              </block>
            </value>
            <statement name="DO">
                ${createBlockXmlSequence(method.body)}
            </statement>
          </block>
        `;
      break;

    case "while":
      blockXml = `
          <block type="while">
            <value name="CONDITION">
              <block type="${method.condition.type}">
                <value name="A">
                    ${createBlockXml(method.condition.arg0)}  
                </value>
                <value name="B">
                    ${createBlockXml(method.condition.arg1)}
                </value>
              </block>
            </value>
            <statement name="DO">
              ${createBlockXmlSequence(method.body)}
            </statement>
          </block>
        `;
      break;

    case "for_with_cnt":
      blockXml = `
              <block type="for_with_cnt">
                <value name="VAR">${createBlockXml(method.var)}</value>
                <value name="ARRAY">${createBlockXml(method.list)}</value>
                <statement name="DO">
                    ${createBlockXmlSequence(method.body)}
                </statement>
              </block>
            `;
      break;

    case "def":
      blockXml = `
          <block type="def">
            <field name="NAME">${method.name}</field>
            <value name="VALUE">
              ${createBlockXml(method.initial)}
            </value>
          </block>
        `;
      break;

    case "try_except":
      blockXml = `
              <block type="try_except">
                <statement name="TRY">
                ${createBlockXmlSequence(method.try)}
                </statement>
                <statement name="EXCEPT">
                ${createBlockXmlSequence(method.except)}
                </statement>
              </block>
            `;
      break;

    case "pass":
      blockXml = `
              <block type="pass"></block>
            `;
      break;

    case "return":
      blockXml = `
              <block type="return"></block>
            `;
      break;

    case "dec":
      blockXml = `
              <block type="dec">
              <value name="VAR">
                ${createBlockXml(method.var)}
              </value>
              </block>
            `;
      break;

    case undefined:
      switch (method[0]) {
        case "[":
          blockXml = `
                <block type="${transformArg(method)}"></block>
            `;
          break;
        default:
          blockXml = `
                <block type="const">
                    <field name="VALUE">${method}</field>
                </block>
            `;
      }
      break;

    default:
      console.warn(`Unhandled type: ${method.type}`);
      break;
  }
  return blockXml;
}

export {
    generateFlowXml
}
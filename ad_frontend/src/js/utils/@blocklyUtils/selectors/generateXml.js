function generateBlocklyXmlFromTree(tree) {
  // 기본 XML 시작 태그
  let xml = `<xml xmlns="https://developers.google.com/blockly/xml">\n`;
  xml += createBlockXml(tree);
  xml += `</xml>`;
  return xml;
}

// 트리의 노드에 따라 XML 생성
function createBlockXml(node) {
  if (!node) return "";

  // 각 노드 타입별 블록 XML 생성
  switch (node.type) {
    case "Root":
      // Root 노드의 자식들(주로 Element)을 처리
      return node.children.map((child) => createBlockXml(child)).join("\n");

    case "Element":
      if (node.name != "Text")
        return `
          <block type="base_block">
            <field name="STRING">${node.name}</field>
            ${
              node.condition
                ? `<value name="BLOCK">${createBlockXml(
                    node.condition
                  )}</value>`
                : ""
            }
            ${
              node.children && node.children[0]
                ? `<next>${createBlockXml(node.children[0])}</next>`
                : ""
            }
          </block>
        `;
      else
        return `
          <block type="text">
            ${
              node.condition
                ? `<value name="BLOCK">${createBlockXml(
                    node.condition
                  )}</value>`
                : ""
            }
            ${
              node.children && node.children[0]
                ? `<next>${createBlockXml(node.children[0])}</next>`
                : ""
            }
          </block>
        `;

    case "Condition":
      // Condition 블록 내의 각 clause 처리
      if (node.clauses.length === 0) {
        return `<block type="true"></block>`;
      } else if (node.clauses.length === 1) {
        // 단일 조건일 경우 바로 clause를 처리
        return createBlockXml(node.clauses[0]);
      } else {
        // 여러 조건이 있을 경우 AND 블록으로 묶어서 처리
        let xml = createBlockXml(node.clauses[0]);
        for (let i = 1; i < node.clauses.length; i++) {
          xml = `
                <block type="and_block">
                  <value name="A">${xml}</value>
                  <value name="B">${createBlockXml(node.clauses[i])}</value>
                </block>
              `;
        }
        return xml;
      }

    case "Contains":
      if (node.attribute == "@class")
        return `
          <block type="contains">
            <field name="STRING">${node.values[0]}</field>
          </block>
        `;
      else
        return `
          <block type="attribute_contains">
            <field name="STRING">${node.value}</field>
            <field name="ATTRIBUTE">${node.attribute.slice(1)}</field>
          </block>
        `;

    case "Equals": // equals 조건 추가
      if (node.attribute == "@class")
        return `
          <block type="equals">
            <field name="STRING">${node.value}</field>
          </block>
        `;
      else
        return `
          <block type="attribute_equals">
            <field name="STRING">${node.value}</field>
            <field name="ATTRIBUTE">${node.attribute.slice(1)}</field>
          </block>
        `;

    case "AND":
      return `
          <block type="and_block">
            <value name="A">${createBlockXml(node.clauses[0])}</value>
            <value name="B">${createBlockXml(node.clauses[2])}</value>
          </block>
        `;

    case "FollowingSibling":
      return `
          <block type="following_sibling">
            <field name="num">${node.index}</field>
            <field name="tag">${node.tag}</field>
          </block>
        `;

    case "Has_tag":
      return `
            <block type="has_tag">
              <field name="STRING">${node.value}</field>
            </block>
          `;

    case "order":
      return `
          <block type="order">
            <field name="num">${node.value}</field>
          </block>
        `;

    case "normalize-space":
      return `
          <block type="normalize-space"></block>
        `;

    default:
      return "";
  }
}

export default generateBlocklyXmlFromTree;

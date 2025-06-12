import * as Blockly from "blockly";
import { javascriptGenerator } from "blockly/javascript";
import { generateFlowXml } from "../../utils/@blocklyUtils/flow/generateFlowXml";
import { generateJsonFromXml } from "../../utils/@blocklyUtils/flow/generateJsonFromXml";

javascriptGenerator.ORDER_ATOMIC = 0;
javascriptGenerator.ORDER_NONE = 99;

const typesArray = [
  "visit",
  "click",
  "enter",
  "handle_alert",
  "handle_popup",
  "switch_to",
  "come_back",
  // "check_downloaded",
  // "track_download_progress",
  "switch_popup",
  "len",
  "wait_until_list",
  "wait_and_click",
  "find_list",
  "texts_in_list",
  "find",
];

const createToolboxConfiguration = (data) => {
  return {
    kind: "categoryToolbox",
    contents: [
      {
        kind: "category",
        name: "Function",
        contents: typesArray.map((type) => ({ kind: "block", type })),
      },
      {
        kind: "category",
        name: "System",
        contents: [
          { kind: "block", type: "if" },
          { kind: "block", type: "for_with_cnt" },
          { kind: "block", type: "try_except" },
          { kind: "block", type: "while" },
          { kind: "block", type: "def" },
          { kind: "block", type: "pass" },
          { kind: "block", type: "return" },
        ],
      },
      {
        kind: "category",
        name: "Basic Math Operation",
        contents: [
          { kind: "block", type: "gt" },
          { kind: "block", type: "dec" },
          { kind: "block", type: "eq" },
        ],
      },
      {
        kind: "category",
        name: "Selectors",
        contents: Object.keys(data.selectors).map((key) => ({
          kind: "block",
          type: `selectors_${key}`,
        })),
      },
      {
        kind: "category",
        name: "URLs",
        contents: Object.keys(data.urls).map((key) => ({
          kind: "block",
          type: `urls_${key}`,
        })),
      },
      {
        kind: "category",
        name: "Credentials",
        contents: Object.keys(data.credentials).map((key) => ({
          kind: "block",
          type: `credentials_${key}`,
        })),
      },
      {
        kind: "category",
        name: "Other",
        contents: [
          { kind: "block", type: "const" },
        ],
      },
    ],
  };
};

const defineBlocks = (data) => {
  Blockly.defineBlocksWithJsonArray([
    {
      type: "visit",
      message0: "Visit Link %1",
      args0: [{ type: "input_value", name: "STRING", text: "Link" }],
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "click",
      message0: "Click Button %1",
      args0: [{ type: "input_value", name: "STRING", text: "Button" }],
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "enter",
      message0: "Enter %1 in %2",
      args0: [
        { type: "input_value", name: "FIELD", text: "Field" },
        { type: "input_value", name: "VALUE", text: "Value" },
      ],
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "handle_alert",
      message0: "Handle alerts",
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "handle_popup",
      message0: "Handle Popups",
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "switch_to",
      message0: "Switch to Frame %1",
      args0: [{ type: "input_value", name: "STRING", text: "Frame" }],
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "come_back",
      message0: "Switch to main interface",
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "switch_popup",
      message0: "Switch to pop-up",
      previousStatement: null,
      nextStatement: null,
    },
    // {
    //   type: "check_downloaded",
    //   message0:
    //     "중복확인하기 (동영상 파일명: %1, 동영상 크기: %2, 판매자명: %3, 게시물 번호: %4, 제목: %5, 닫기버튼: %6)",
    //   args0: [
    //     { type: "input_value", name: "FILES", text: "파일들" },
    //     { type: "input_value", name: "SIZES", text: "크기" },
        
    //     { type: "input_value", name: "SELLER", text: "판매자" },
    //     { type: "input_value", name: "ITEM_NUMBER", text: "품번" },
    //     { type: "input_value", name: "TITLE", text: "제목" },
    //     { type: "input_value", name: "CLOSE", text: "닫기 버튼" },
    //   ],
    //   previousStatement: null,
    //   nextStatement: null,
    // },
    // {
    //   type: "track_download_progress",
    //   message0:
    //     "다운로드 진행 (동영상 파일명: %1, 파일 크기: %2, 판매자명: %3, 게시물 번호: %4, 제목: %5)",
    //   args0: [
    //     { type: "input_value", name: "FILES", text: "파일들" },
    //     { type: "input_value", name: "SIZES", text: "크기" },
    //     { type: "input_value", name: "SELLER", text: "판매자" },
    //     { type: "input_value", name: "ITEM_NUMBER", text: "품번" },
    //     { type: "input_value", name: "TITLE", text: "제목" },
    //   ],
    //   previousStatement: null,
    //   nextStatement: null,
    // },
    {
      type: "len",
      message0: "Length of %1",
      args0: [{ type: "input_value", name: "STRING", text: "Character string" }],
      output: "String",
    },
    {
      type: "find",
      message0: "The instance %1 points to",
      args0: [{ type: "input_value", name: "SELECTOR" }],
      output: "String",
    },
    {
      type: "texts_in_list",
      message0: "Texts from %1 instances",
      args0: [{ type: "input_value", name: "LIST" }],
      output: "String",
    },
    {
      type: "find_list",
      message0: "Find the %1 instance list",
      args0: [{ type: "input_value", name: "SELECTOR" }],
      output: "String",
    },
    {
      type: "wait_until_list",
      message0: "Wait max %2 seconds while finding %1 instance list",
      args0: [
        { type: "input_value", name: "SELECTOR" },
        { type: "input_value", name: "SECONDS" },
      ],
      output: "String",
    },
    {
      type: "wait_and_click",
      message0: "Wait max %2 seconds while finding %1 instance and click",
      args0: [
        { type: "input_value", name: "SELECTOR" },
        { type: "input_value", name: "SECONDS" },
      ],
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "if",
      message0: "If %1 is true",
      args0: [{ type: "input_value", name: "CONDITION" }],
      message1: "Then %1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "for_with_cnt",
      message0: "Repeat consequently with counter i while saving %2 array's ith instance in var %1",
      args0: [
        { type: "input_value", name: "VAR", text: "Variable" },
        { type: "input_value", name: "ARRAY", text: "Array" },
      ],
      message1: "Repeat: %1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "while",
      message0: "While %1 is true",
      args0: [{ type: "input_value", name: "CONDITION" }],
      message1: "Do: %1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "def",
      message0: "Define %1 as",
      args0: [{ type: "field_input", name: "NAME", text: "Variable name" }],
      message1: "Initial value: %1",
      args1: [{ type: "input_value", name: "VALUE" }],
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "try_except",
      message0: "Try: %1",
      args0: [{ type: "input_statement", name: "TRY" }],
      message1: "When exception: %1",
      args1: [{ type: "input_statement", name: "EXCEPT" }],
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "pass",
      message0: "Do nothing and pass",
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "return",
      message0: "End sequence successfully",
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "gt",
      message0: "%1 > %2",
      args0: [
        { type: "input_value", name: "A", text: "Value 1" },
        { type: "input_value", name: "B", text: "Value 2" },
      ],
      output: "String",
    },
    {
      type: "dec",
      message0: "Decrease %1",
      args0: [{ type: "input_value", name: "VAR", text: "Variable" }],
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "eq",
      message0: "%1 == %2",
      args0: [
        { type: "input_value", name: "A", text: "Value 1" },
        { type: "input_value", name: "B", text: "Value 2" },
      ],
      output: "String",
    },
  ]);

  // Selectors 블록 정의
  Object.keys(data.selectors).forEach((key) => {
    Blockly.defineBlocksWithJsonArray([
      {
        type: `selectors_${key}`,
        message0: `%1`,
        args0: [{ type: "field_label", name: "VALUE", text: key }],
        output: "String", // 다른 블록의 입력으로 사용 가능
        colour: 210,
        tooltip: `Selector for ${key}`,
        helpUrl: "",
      },
    ]);
  });

  // URLs 블록 정의
  Object.keys(data.urls).forEach((key) => {
    Blockly.defineBlocksWithJsonArray([
      {
        type: `urls_${key}`,
        message0: `%1`,
        args0: [{ type: "field_label", name: "VALUE", text: key }],
        output: "String", // 다른 블록의 입력으로 사용 가능
        colour: 120,
        tooltip: `URL for ${key}`,
        helpUrl: "",
      },
    ]);
  });

  // Credentials 블록 정의
  Object.keys(data.credentials).forEach((key) => {
    Blockly.defineBlocksWithJsonArray([
      {
        type: `credentials_${key}`,
        message0: `%1`,
        args0: [{ type: "field_label", name: "VALUE", text: key }],
        output: "String",
        colour: 180,
        tooltip: `Credential for ${key}`,
        helpUrl: "",
      },
    ]);
  });

  // 기타 값 블록 정의
  Blockly.defineBlocksWithJsonArray([
    {
      type: "const",
      message0: "%1",
      args0: [{ type: "field_input", name: "VALUE", text: "Variable name or Constant" }],
      output: "String",
    },
  ]);
};

export {
  typesArray,
  createToolboxConfiguration,
  defineBlocks,
  generateFlowXml,
  generateJsonFromXml,
  javascriptGenerator,
};

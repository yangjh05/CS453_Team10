import * as Blockly from "blockly";
import { javascriptGenerator } from "blockly/javascript";
import React, { useEffect } from "react";

const toolboxConfiguration = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Components",
      contents: [
        { kind: "block", type: "base_block" },
        { kind: "block", type: "text" },
        { kind: "block", type: "attribute_equals" },
        { kind: "block", type: "equals" },
        { kind: "block", type: "attribute_contains" },
        { kind: "block", type: "contains" },
        { kind: "block", type: "and_block" },
        { kind: "block", type: "following_sibling" },
        { kind: "block", type: "order" },
        { kind: "block", type: "has_tag" },
        { kind: "block", type: "normalize-space" },
        { kind: "block", type: "true" },
      ],
    },
  ],
};

const defineCustomBlocks = () => {
  Blockly.defineBlocksWithJsonArray([
    {
      type: "base_block",
      message0: "With %2 satisfied, select the %1 tag.",
      args0: [
        { type: "field_input", name: "STRING", text: "html_tag" },
        { type: "input_value", name: "BLOCK" },
      ],
      colour: 160,
      tooltip: "Takes a string and a block as input.",
      helpUrl: "",
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "text",
      message0: "Select the text with %1.",
      args0: [{ type: "input_value", name: "BLOCK" }],
      colour: 190,
      tooltip: "Takes a block as input.",
      helpUrl: "",
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "attribute_equals",
      message0: "Name of the attribute %2 equals to '%1'.",
      args0: [
        { type: "field_input", name: "STRING", text: "class" },
        { type: "field_input", name: "ATTRIBUTE", text: "attribute" },
      ],
      colour: 230,
      tooltip: "Enter the class name and attribute name",
      helpUrl: "",
      output: "String",
    },
    {
      type: "equals",
      message0: "Class name is '%1'.",
      args0: [{ type: "field_input", name: "STRING", text: "class" }],
      colour: 230,
      tooltip: "Enter the class name",
      helpUrl: "",
      output: "String",
    },
    {
      type: "attribute_contains",
      message0: "Contains '%1' in the name of the %2 attribute.",
      args0: [
        { type: "field_input", name: "STRING", text: "class" },
        { type: "field_input", name: "ATTRIBUTE", text: "attribute" },
      ],
      colour: 230,
      tooltip: "Enter the class name and attribute name",
      helpUrl: "",
      output: "String",
    },
    {
      type: "contains",
      message0: "Contains '%1' in the name of the class attribute.",
      args0: [{ type: "field_input", name: "STRING", text: "class" }],
      colour: 230,
      tooltip: "Enter the common substring of the class name",
      helpUrl: "",
      output: "String",
    },
    {
      type: "and_block",
      message0: "Satisfies %1 and %2",
      args0: [
        { type: "input_value", name: "A" },
        { type: "input_value", name: "B" },
      ],
      colour: 210,
      tooltip: "Logical AND of two blocks.",
      helpUrl: "",
      output: "String",
    },
    {
      type: "following_sibling",
      message0: "In the %2 tags, select its %1-th sibling element.",
      args0: [
        { type: "field_input", name: "num", text: "1" },
        { type: "field_input", name: "tag", text: "html_tag" },
      ],
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: "order",
      message0: "%1 (th)",
      args0: [{ type: "field_input", name: "num", text: "1" }],
      output: null,
    },
    {
      type: "has_tag",
      message0: "Includes %1",
      args0: [{ type: "field_input", name: "STRING", text: "html_tag" }],
      output: "String",
    },
    {
      type: "normalize-space",
      message0: "Deletes white spaces",
      output: "String",
    },
    {
      type: "true",
      message0: "*",
      output: "String",
    },
  ]);

  javascriptGenerator.forBlock["base_block"] = function (block) {
    const string = block.getFieldValue("STRING");
    const blockCode = javascriptGenerator
      .statementToCode(block, "BLOCK")
      .trim();
    if (blockCode == "") return `//${string}`;
    return `//${string}[${blockCode}]`;
  };

  javascriptGenerator.forBlock["text"] = function (block) {
    const blockCode = javascriptGenerator
      .statementToCode(block, "BLOCK")
      .trim();
    if (blockCode == "") return `//$text()`;
    return `//text()[${blockCode}]`;
  };

  javascriptGenerator.forBlock["attribute_equals"] = function (block) {
    const string = block.getFieldValue("STRING");
    const attribute = block.getFieldValue("ATTRIBUTE");
    return `@${attribute}='${string}'`;
  };

  javascriptGenerator.forBlock["equals"] = function (block) {
    const string = block.getFieldValue("STRING");
    return `@class='${string}'`;
  };

  javascriptGenerator.forBlock["attribute_contains"] = function (block) {
    const string = block.getFieldValue("STRING");
    const attribute = block.getFieldValue("ATTRIBUTE");
    return `contains(@${attribute}, '${string}')`;
  };

  javascriptGenerator.forBlock["contains"] = function (block) {
    const string = block.getFieldValue("STRING");
    return `contains(@class, '${string}')`;
  };

  javascriptGenerator.forBlock["and_block"] = function (block) {
    const valueA = javascriptGenerator.statementToCode(block, "A").trim();
    const valueB = javascriptGenerator.statementToCode(block, "B").trim();
    return `${valueA} and ${valueB}`;
  };

  javascriptGenerator.forBlock["following_sibling"] = function (block) {
    const num = block.getFieldValue("num");
    const tag = block.getFieldValue("tag");
    return `/following-sibling::${tag}[${num}]`;
  };

  javascriptGenerator.forBlock["order"] = function (block) {
    const num = block.getFieldValue("num");
    return `${num}`;
  };

  javascriptGenerator.forBlock["has_tag"] = function (block) {
    const string = block.getFieldValue("STRING");
    return `${string}`;
  };

  javascriptGenerator.forBlock["true"] = function (block) {
    return "";
  };

  javascriptGenerator.forBlock["normalize-space"] = function (block) {
    return "normalize-space()";
  };
};

export {
	toolboxConfiguration,
	defineCustomBlocks,
}

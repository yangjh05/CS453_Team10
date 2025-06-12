function parseXPath(xpath) {
  const tokens = tokenize(xpath);
  const tree = buildTree(tokens);
  return tree;
}

// 1. 토큰화 함수
function tokenize(xpath) {
  const tokenSpec = [
    { type: "DOUBLE_SLASH", regex: /^\/\// },
    { type: "SLASH", regex: /^\// },
    { type: "AXIS", regex: /^following-sibling::/ },
    { type: "FUNCTION", regex: /^(contains|text|normalize-space)(?=\()/ },
    { type: "LOGICAL_OPERATOR", regex: /^(and|or)\b/ },
    { type: "NUMBER", regex: /^\d+/ },
    { type: "WILDCARD", regex: /^\*/ },  // Added wildcard token
    { type: "NODE_NAME", regex: /^\w+/ },
    { type: "LBRACKET", regex: /^\[/ },
    { type: "RBRACKET", regex: /^\]/ },
    { type: "ATTRIBUTE", regex: /^@[a-zA-Z_][a-zA-Z0-9_-]*/ },
    { type: "EQUAL", regex: /^=/ },
    { type: "STRING", regex: /^'[^']*'|^"[^"]*"/ },
    { type: "LPAREN", regex: /^\(/ },
    { type: "RPAREN", regex: /^\)/ },
    { type: "COMMA", regex: /^,/ },
    { type: "WHITESPACE", regex: /^\s+/ },
  ];

  const tokens = [];
  let input = xpath;

  while (input) {
    let matched = false;
    for (const { type, regex } of tokenSpec) {
      const match = input.match(regex);
      if (match) {
        if (type !== "WHITESPACE") {
          tokens.push({ type, value: match[0] });
        }
        input = input.slice(match[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      throw new Error(`Unexpected token: ${input}`);
    }
  }
  return tokens;
}

// 2. 구문 트리 생성 함수
function buildTree(tokens) {
  const root = { type: "Root", children: [] };
  let current = root;

  while (tokens.length) {
    const token = tokens.shift();
    if (token.type === "DOUBLE_SLASH" || token.type === "SLASH") {
      const nextToken = tokens[0]; // Peek at next token instead of shifting
      if (nextToken.type === "NODE_NAME" || nextToken.type === "WILDCARD") {
        tokens.shift(); // Now consume the token
        const node = { 
          type: "Element", 
          name: nextToken.value,
          isWildcard: nextToken.type === "WILDCARD",
          children: [] 
        };

        // Add default condition block
        node.condition = { type: "Condition", clauses: [] };

        current.children.push(node);
        current = node;
      } else if (nextToken.type === "AXIS") {
        tokens.shift(); // Consume axis token
        const elementToken = tokens.shift();
        if (elementToken.type === "NODE_NAME" || elementToken.type === "WILDCARD") {
          tokens.shift();
          const nextNumToken = tokens.shift();
          if (nextNumToken.type === "NUMBER") {
            const siblingNode = {
              type: "FollowingSibling",
              tag: elementToken.value,
              isWildcard: elementToken.type === "WILDCARD",
              index: nextNumToken.value,
            };
            current.children.push(siblingNode);
            tokens.shift();
          }
        }
      } else if (nextToken.type === "FUNCTION") {
        tokens.shift(); // Consume function token
        if (nextToken.value === "text") {
          const node = { type: "Element", name: "Text", children: [] };
          node.condition = { type: "Condition", clauses: [] };

          current.children.push(node);
          current = node;

          tokens.shift(); // LPAREN
          tokens.shift(); // RPAREN
        }
      }
    } else if (token.type === "LBRACKET") {
      const condition = [];
      while (tokens[0] && tokens[0].type !== "RBRACKET") {
        condition.push(tokens.shift());
      }
      if (tokens[0]) {
        tokens.shift(); // Remove RBRACKET
        current.condition = parseCondition(condition);
      }
    } else if (token.type === "NUMBER") {
      current.index = parseInt(token.value, 10);
    }
  }
  return root;
}

// 3. 조건 구문 파싱 함수
function parseCondition(tokens) {
  const condition = { type: "Condition", clauses: [] };

  while (tokens.length) {
    const token = tokens.shift();

    if (token.type === "FUNCTION") {
      if (token.value === "contains") {
        tokens.shift(); // LPAREN
        const attribute = tokens.shift();
        tokens.shift(); // COMMA
        const values = [];

        while (tokens[0] && tokens[0].type !== "RPAREN") {
          values.push(tokens.shift().value.replace(/['"]/g, ""));
          if (tokens[0] && tokens[0].type === "COMMA") {
            tokens.shift();
          }
        }
        if (tokens[0]) {
          tokens.shift(); // RPAREN
        }

        condition.clauses.push({
          type: "Contains",
          attribute: attribute.value,
          values: values,
        });
      } else if (token.value === "normalize-space") {
        tokens.shift();
        tokens.shift();
        condition.clauses.push({
          type: "normalize-space",
        });
      }
    } else if (token.type === "ATTRIBUTE") {
      const attribute = token.value;
      if (tokens[0] && tokens[0].type === "EQUAL") {
        tokens.shift();
        const value = tokens.shift();
        condition.clauses.push({
          type: "Equals",
          attribute,
          value: value.value.replace(/['"]/g, ""),
        });
      }
    } else if (token.type === "LOGICAL_OPERATOR" && token.value === "and") {
      // AND operator handling (left empty as in original)
    } else if (token.type === "NODE_NAME" || token.type === "WILDCARD") {
      condition.clauses.push({ 
        type: "Has_tag", 
        value: token.value,
        isWildcard: token.type === "WILDCARD"
      });
    } else if (token.type === "NUMBER") {
      condition.clauses.push({ type: "order", value: token.value });
    }
  }

  return condition;
}

export default parseXPath;
function jq(myid) {
  return "#" + myid;
};

var ID = function () {
  // Math.random should be unique because of its seeding algorithm.
  // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  // after the decimal.
  return '_' + Math.random().toString(36).substr(2, 9);
};

function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection != "undefined"
            && typeof document.createRange != "undefined") {
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (typeof document.body.createTextRange != "undefined") {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(false);
        textRange.select();
    }
}

var rootNode;
var objectTable = {};

function addToObjectTable(node) {
  objectTable[node.id] = node;
};

if (localStorage['rootNode'] == undefined) {
  rootNode = new Node(null, null);
  addToObjectTable(rootNode);
  var container = $('#container');
  var rootUL = $('<ul />');
  rootUL.attr('id', rootNode.id);
  rootUL.attr('class', 'main');
  container.append(rootUL)
} else {
  rootNode = JSON.parse(localStorage['rootNode']);
  objectTable = JSON.parse(localStorage['objectTable']);
  var container = $('#container');
  var rootUL = $('<ul />');
  rootUL.attr('id', rootNode.id);
  rootUL.attr('class', 'main');
  container.append(rootUL)
}



function Node(data, parentId = null) {
  this.id = ID();
  this.parentId = parentId;
  this.data = data;
  this.children = [];
}

function createChildFor(parentNode) {
  var child = new Node('', parentNode.id);
  parentNode.children.push(child.id);
  addToObjectTable(child);
  return child;
};

function createNewNode(sibling) {
  if (sibling) {
    if (sibling.children.length > 0) {
      var parent = sibling;
    } else {
      var parent = objectTable[sibling.parentId];
    }
  } else {
    var parent = objectTable[rootNode.id];
  }

  var child = new Node('', parent.id);

  if (sibling) {
    if (sibling.children.length > 0) {
      parent.children.splice(0, 0, child.id);
    } else {
      var siblingIndex = parent.children.indexOf(sibling.id);
      parent.children.splice(siblingIndex + 1, 0, child.id);
    }
  } else {
    parent.children.push(child.id);
  }

  addToObjectTable(child);
  return child;
}

function deleteNode(node) {
  var parent = objectTable[node.parentId];
  parent.children = parent.children.filter(function(childId) {
    return childId !== node.id;
  });
  if (node.parentId == rootNode.id) {
    rootNode.children = rootNode.children.filter(function(childId) {
      return childId != node.id;
    });
  }
  delete objectTable[node.id];
}

function shiftNodeRight(node) {
  var oldParent = objectTable[node.parentId];
  var prevSiblingIndex =  oldParent.children.indexOf(node.id) - 1;
  var newParentId = oldParent.children[prevSiblingIndex];

  var itemObject = objectTable[node.id];
  var newParent = objectTable[newParentId];

  itemObject.parentId = newParentId;
  newParent.children.push(itemObject.id);
  oldParent.children = oldParent.children.filter(function(childId) {
    return childId !== node.id;
  });
};

function shiftNodeLeft(node) {
  var currentElementObject = objectTable[node.id];
  var currentParentObject = objectTable[node.parentId];

  var currentObjectIndex = currentParentObject.children.indexOf(node.id);
  while(currentParentObject.children[currentObjectIndex + 1] !== undefined) {
    var siblingObject = objectTable[currentParentObject.children[currentObjectIndex + 1]];
    console.log(siblingObject.id);
    shiftNodeRight(siblingObject);
  }



  var newParentObject = objectTable[currentParentObject.parentId];
  currentElementObject.parentId = newParentObject.id;
  var currentParentObjectIndex = newParentObject.children.indexOf( currentParentObject.id); 

  newParentObject.children.splice(currentParentObjectIndex + 1, 0, currentElementObject.id);
  currentParentObject.children = currentParentObject.children.filter(function(childId) {
    return childId !== node.id;
  });
};

function rerender(nodeId) {
  var currentElement = $(jq(nodeId));
  var currentElementObject = objectTable[nodeId];
  currentElement.empty();

  if (currentElement.is('ul')) {
    for (let childId of currentElementObject.children) {
      var childNode = $('<li />');
      childNode.attr('id', childId);
      currentElement.append(childNode);
      rerender(childId);
    }
  } else {
    var span = $('<span />');
    span.attr('contentEditable','true');
    span.text(currentElementObject.data);
    currentElement.append(span);
    giveNodeSomePower(currentElement);

    var childTree = $('<ul />');
    currentElement.append(childTree);

    for (let childId of currentElementObject.children) {
      var childNode = $('<li />');
      childNode.attr('id', childId);
      childTree.append(childNode);
      rerender(childId);
    }
  }
}

function removeNode(nodeId) {
  var node = $(jq(nodeId));
  node.unbind();
  node.remove();
}

// function indentRight(node) {
//   var nodeId = node.id;
//   var node = $(jq(nodeId));
//   var prevNode = node.prev();
//   node.unbind();
//   node.remove();

//   var nodeObject = objectTable[nodeId];
//   var indentWrapper = $('<ul />');
//   var regeneratedNode = $('<li />');
//   regeneratedNode.attr('id', nodeId);

//   var span = $('<span />');
//   span.attr('contentEditable','true');
//   span.text(nodeObject.data);
//   regeneratedNode.append(span);

//   indentWrapper.append(regeneratedNode);
//   prevNode.append(indentWrapper);
//   giveNodeSomePower(regeneratedNode);
// }

function store() {
  localStorage['rootNode'] = JSON.stringify(rootNode);
  localStorage['objectTable'] = JSON.stringify(objectTable);
}

function giveNodeSomePower(nodeItem) {
  var node = objectTable[nodeItem.attr('id')];
  var nodeSpan = $('span:first', nodeItem);

  placeCaretAtEnd(nodeSpan.get(0));
  // nodeSpan.focus();

  nodeSpan.blur(function() {
    node.data = nodeSpan.text();
    store();
  });

  nodeSpan.keydown(function(event) {
    var ENTERKEY = 13;
    var TABKEY = 9;
    var BACKSPACE = 8;
    if (event.keyCode == ENTERKEY) {
      event.preventDefault();
      event.stopPropagation();
      node.data = nodeSpan.text();
      store();
      // var parentNode = objectTable[node.parentId];
      // var newNode = createChildFor(parentNode);
      var newNode = createNewNode(node);
      rerender(newNode.parentId);
      positionCaret(newNode);
      // render(newNode);
    } else if (event.keyCode == TABKEY) {
      event.preventDefault();
      node.data = nodeSpan.text();
      store();
      if (event.shiftKey) {
        if (node.parentId !== rootNode.id) {
          shiftNodeLeft(node);
          rerender(objectTable[node.id].parentId);
          positionCaret(node);
        } 
      } else {
        if (!nodeItem.is(':first-child')) {
          shiftNodeRight(node);
          removeNode(node.id);
          rerender(objectTable[node.id].parentId);
          positionCaret(node);
        }
      }
    } else if (event.keyCode == BACKSPACE) {
      if (!nodeSpan.text()) {
        if (!(node.parentId == rootNode.id && objectTable[rootNode.id].children.length == 1)) {
          event.preventDefault();
          var parentId = node.parentId;
          deleteNode(node);
          rerender(parentId);
        }
      }
    }
  });

}

function positionCaret(node) {
  var node = $(jq(node.id));
  var nodeSpan = $('span:first', node);
  placeCaretAtEnd(nodeSpan.get(0));
}

function render(node, first = false) {
  var nodeItem = $('<li />');
  nodeItem.attr('id', node.id);

  var span = $('<span />');
  span.attr('contentEditable','true');
  nodeItem.append(span);

  var parentNode = $(jq(node.parentId));
  if (parentNode.is('ul')) {
    parentNode.append(nodeItem);
    giveNodeSomePower(nodeItem);
  } else {
    parentNode = $('ul', parentNode);
    parentNode.append(nodeItem);
    giveNodeSomePower(nodeItem);
  }
  positionCaret(node);
}


if (localStorage['rootNode'] == undefined) {
  var firstNode = createNewNode(null)
  render(firstNode, true);
} else {
  rerender(rootNode.id);
}


$('#debug').click(function() {
  console.log(JSON.stringify(rootNode));
  console.log(JSON.stringify(objectTable));
});

$('#reset').click(function() {
  delete localStorage['rootNode'];
  delete localStorage['objectTable'];
  window.location.reload();
});


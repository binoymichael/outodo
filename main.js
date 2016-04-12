function jq(myid) {
  return "#" + myid;
};

var ID = function () {
  // Math.random should be unique because of its seeding algorithm.
  // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  // after the decimal.
  return '_' + Math.random().toString(36).substr(2, 9);
};

function createCaretPlacer(atStart) {
    return function(el) {
        el.focus();
        if (typeof window.getSelection != "undefined"
                && typeof document.createRange != "undefined") {
            var range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(atStart);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (typeof document.body.createTextRange != "undefined") {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(el);
            textRange.collapse(atStart);
            textRange.select();
        }
    };
}

var placeCaretAtStart = createCaretPlacer(true);
var placeCaretAtEnd = createCaretPlacer(false);

var rootNode;
var objectTable = {};

function addToObjectTable(node) {
  objectTable[node.id] = node;
};

function ancestors(node, accumulator = []) {
  if (node.parentId == null) {
    return accumulator;
  } else {
    var parent = objectTable[node.parentId];
    if (parent.parentId !== null) {
      accumulator.unshift(parent);
    }
    return ancestors(parent, accumulator);
  }
}

if (localStorage['rootNode'] == undefined) {
  rootNode = new Node(null, null);
  addToObjectTable(rootNode);
} else {
  rootNode = JSON.parse(localStorage['rootNode']);
  objectTable = JSON.parse(localStorage['objectTable']);
}

var viewRootNode = rootNode;
var container = $('#container');
var navBar = $('<div />');
navBar.attr('class', 'navbar');
navBar.append($('<span class="grey">></span>'));
var rootUL = $('<ul />');
rootUL.attr('id', viewRootNode.id);
rootUL.attr('class', 'main');
container.append(navBar);
container.append(rootUL);


function Node(data, parentId = null) {
  this.id = ID();
  this.parentId = parentId;
  this.data = data;
  this.expanded = true;
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
    if (sibling.children.length > 0 && sibling.expanded) {
      var parent = sibling;
    } else {
      var parent = objectTable[sibling.parentId];
    }
  } else {
    var parent = objectTable[viewRootNode.id];
  }

  var child = new Node('', parent.id);

  if (sibling) {
    if (sibling.children.length > 0 && sibling.expanded) {
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

function deleteChildren(node) {
  for (let childId of node.children) {
    delete objectTable[childId];
  }
  node.children = [];
}

function deleteNode(node) {
  console.log("deleting" + node.id);
  var parent = objectTable[node.parentId];
  parent.children = parent.children.filter(function(childId) {
    return childId !== node.id;
  });
  if (node.parentId == viewRootNode.id) {
    viewRootNode.children = viewRootNode.children.filter(function(childId) {
      return childId != node.id;
    });
  }

  for (let childId of node.children) {
    delete objectTable[childId];
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
    // console.log(siblingObject.id);
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

    if (currentElementObject.children.length > 0) {
      var expander = $('<span />');
      var expanderText = currentElementObject.expanded ? '-' : '+'
      expander.text(expanderText);
      expander.addClass('expander');
    }

    currentElement.append(span);
    currentElement.append(expander);
    giveNodeSomePower(currentElement);

    var childTree = $('<ul />');
    currentElement.append(childTree);

    if (currentElementObject.expanded) {
      for (let childId of currentElementObject.children) {
        var childNode = $('<li />');
        childNode.attr('id', childId);
        childTree.append(childNode);
        rerender(childId);
      }
    }
  }
}

function removeNode(nodeId) {
  var node = $(jq(nodeId));
  node.unbind();
  node.remove();
}

function isOnlyMainBranch(node) {
  return (node.parentId == viewRootNode.id && objectTable[viewRootNode.id].children.length == 1)
}

function store() {
  localStorage['rootNode'] = JSON.stringify(rootNode);
  localStorage['objectTable'] = JSON.stringify(objectTable);
}

function changeViewPort(viewRootNodeId) {
  var viewRootNode = objectTable[viewRootNodeId];
  var container = $('#container');
  container.empty();
  var navBar = $('<div />');
  navBar.attr('class', 'navbar');
  navBar.append($('<span class="grey">></span>'));
  var navBarSegments = ancestors(viewRootNode);
  navBarSegments.push(viewRootNode);
  for (let node of navBarSegments) {
    var navSegment = $('<a class="grey" href="#"/>')
    navSegment.click(function(event) {
      event.preventDefault();
      event.stopPropagation();
      changeViewPort(node.id);
      // console.log('hello');
    });
    navSegment.text(node.data);
    navBar.append(navSegment);
    navBar.append($('<span class="grey">></span>'));
  }
  container.append(navBar);

  var rootUL = $('<ul />');
  rootUL.attr('id', viewRootNodeId);
  rootUL.attr('class', 'main');
  container.append(rootUL)
  rerender(viewRootNodeId);

}

function giveNodeSomePower(nodeItem) {
  var node = objectTable[nodeItem.attr('id')];
  var nodeSpan = $('span:first', nodeItem);
  var expander = $('span.expander:first', nodeItem);
  if (expander.length != 0) {
    expander.click(function() {
      node.expanded = !node.expanded;
      rerender(node.id);
    });
  }

  nodeSpan.dblclick(function() {
    var viewRootNodeId = $(this).closest('li').attr('id');
    changeViewPort(viewRootNodeId);
  });


  placeCaretAtEnd(nodeSpan.get(0));

  nodeSpan.blur(function() {
    node.data = nodeSpan.text();
    store();
  });

  // console.log(nodeSpan.parent());
  nodeSpan.parent().keydown(function(event) {
    // console.log(event);
  });

  nodeSpan.keydown(function(event) {
    // console.log(event);
    var ENTERKEY = 13;
    var TABKEY = 9;
    var BACKSPACE = 8;
    var DOWNKEY = 40;
    var UPKEY = 38;
    if (event.keyCode == ENTERKEY) {
      event.preventDefault();
      event.stopPropagation();
      node.data = nodeSpan.text();
      store();
      var newNode = createNewNode(node);
      rerender(newNode.parentId);
      positionCaret(newNode);
    } else if (event.keyCode == TABKEY) {
      event.preventDefault();
      node.data = nodeSpan.text();
      store();
      if (event.shiftKey) {
        if (node.parentId !== viewRootNode.id) {
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
      if (node.children.length > 0) {
        if (nodeSpan.text().length <= 1) {
          if (nodeSpan.text().charCodeAt(0) == 128) {
              event.preventDefault();
              event.stopPropagation();
              if (isOnlyMainBranch(node)) {
                  nodeSpan.text("");
                  node.data = nodeSpan.text();
                  deleteChildren(node);
                  rerender(node.id);
              } else {
                  var parentId = node.parentId;
                  var closest = previousNode(node);
                  deleteNode(node);
                  rerender(parentId);
                  positionCaret(closest);
              }
          } else {
            nodeSpan.text("\200b");
            positionCaret(node);
          }
        }
      } else if (!nodeSpan.text()) {
          event.preventDefault();
          event.stopPropagation();
          if (isOnlyMainBranch(node)) {
            nodeSpan.text("");
            node.data = nodeSpan.text();
            deleteChildren(node);
            rerender(node.id);
        } else {
            var parentId = node.parentId;
            var closest = previousNode(node);
            deleteNode(node);
            rerender(parentId);
            positionCaret(closest);
        }
      }
    } else if (event.keyCode == UPKEY) {
      event.preventDefault();
      var prevLeaf = previousNode(node);
      positionCaret(prevLeaf);
    } else if (event.keyCode == DOWNKEY) {
      event.preventDefault();
      var nextLeaf = nextNode(node);
      positionCaretAtStart(nextLeaf);
    }
  });

}

function nextNode(node) {
  if (node.children.length > 0 && node.expanded) {
    return objectTable[node.children[0]];
  } else {
    var parent = objectTable[node.parentId];
    var currentNodeIndex = parent.children.indexOf(node.id);
    if (currentNodeIndex == parent.children.length - 1) {
      var grandparent = objectTable[parent.parentId];
      if (grandparent == undefined) {
        return node
      } else {
        currentParentIndex = grandparent.children.indexOf(parent.id);
        var uncleId = grandparent.children[currentParentIndex + 1];
        var uncle = objectTable[uncleId];
        return uncle;
      }
    } else {
      var siblingId = parent.children[currentNodeIndex + 1]; 
      var sibling = objectTable[siblingId];
      return sibling;
    }
  }
}

function previousNode(node) {
  var parent = objectTable[node.parentId];
  var currentNodeIndex = parent.children.indexOf(node.id);
  if (currentNodeIndex == 0) {
    return parent;
  } else {
    var siblingId = parent.children[currentNodeIndex - 1];
    var sibling = objectTable[siblingId];
    // console.log(sibling);
    if (sibling.children.length > 0 && sibling.expanded) {
      return objectTable[sibling.children[sibling.children.length - 1]];
    } else {
      return sibling; 
    }
  }
}

function positionCaretAtStart(node) {
  var node = $(jq(node.id));
  var nodeSpan = $('span:first', node);
  placeCaretAtStart(nodeSpan.get(0));
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
  rerender(viewRootNode.id);
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


$('#level').click(function() {
  var viewRootNodeId = $('li').first().attr('id');
  var viewRootNode = objectTable[viewRootNodeId];
  var container = $('#container');
  container.empty();
  var navBar = $('<div />');
  navBar.attr('class', 'navbar');
  navBar.append($('<span class="grey">></span>'));
  var navBarSegments = ancestors(viewRootNode);
  navBarSegments.push(viewRootNode);
  for (let node of navBarSegments) {
    var navSegment = $('<a class="grey" href="#"/>');
    navSegment.click(function(event) {
      event.preventDefault();
      event.stopPropagation();
      console.log('hello');
    });
    navSegment.text(node.data);
    navBar.append(navSegment);
    navBar.append($('<span class="grey">></span>'));
  }
  container.append(navBar);

  var rootUL = $('<ul />');
  rootUL.attr('id', viewRootNodeId);
  rootUL.attr('class', 'main');
  container.append(rootUL)
  rerender(viewRootNodeId);
});

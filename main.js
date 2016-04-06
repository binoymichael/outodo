var ID = function () {
  // Math.random should be unique because of its seeding algorithm.
  // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  // after the decimal.
  return '_' + Math.random().toString(36).substr(2, 9);
};

var rootNode = new Node(null, null);
var objectTable = {};
function addToObjectTable(node) {
  objectTable[node.id] = node;
};
addToObjectTable(rootNode);



function Node(data, parentId = null) {
  this.id = ID();
  this.parentId = parentId;
  this.data = data;
  this.children = [];
}

function createChildFor(parentNode) {
  var child = new Node('', parentNode.id);
  parentNode.children.push(child);
  addToObjectTable(child);
  return child;
};

function render(node) {
  var nodeItem = $('<li />');
  nodeItem.attr('id', node.id);
  nodeItem.attr('contentEditable','true');
  $('#main').append(nodeItem);
  nodeItem.focus();

  nodeItem.blur(function() {
    objectTable[node.id].data = nodeItem.text();
    console.log(JSON.stringify(rootNode));
  });

  nodeItem.keydown(function(event) {
    if (event.keyCode == 13) {
      event.preventDefault();
      event.stopPropagation();
      var parentNode = objectTable[node.parentId];
      var newNode = createChildFor(parentNode);
      render(newNode);
    }
  });
}


var firstNode = createChildFor(rootNode);
render(firstNode);

$('#main li').focus();


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
  var nodeDiv = $('<div />');
  nodeDiv.attr('id', node.id);
  nodeDiv.attr('contentEditable','true');
  $('#main').append(nodeDiv);
  nodeDiv.focus();

  nodeDiv.blur(function() {
    objectTable[node.id].data = nodeDiv.text();
    console.log(JSON.stringify(rootNode));
  });

  nodeDiv.keydown(function(event) {
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

$('#main div').focus();


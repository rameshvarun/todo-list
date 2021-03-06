var http = require('http');
var swig = require('swig');
var path = require('path');
var gaze = require('gaze');
var walk = require('fs-walk');
var fs = require('fs');
var _ = require('underscore');
var exec = require('exec-queue');
var slug = require('slug')
var todolist = require("./index");

var template = swig.compileFile(path.join(__dirname, 'template.html'));

var server = http.createServer(function (request, response) {
  response.writeHead(200, {"Content-Type": "text/html"});

  // Sort items by type, instead of by file
  items_by_type = {}

  // Sort items by assignee
  items_by_assignee = {}

  for(mark in todolist.marks) {
    items_by_type[mark] = []
  }

  for(file in items_by_file) {
    _.each(items_by_file[file], function(item) {
      items_by_type[item.type].push(item)

      if(item.assignee)
        if( items_by_assignee[item.assignee] )
          items_by_assignee[item.assignee].push(item)
        else
          items_by_assignee[item.assignee] = [item]
    })
  }

  response.end(template({
    items_by_type : items_by_type,
    items_by_assignee : items_by_assignee,
    items_by_file : items_by_file,
    rel_path : function(abs_path) {
      return path.relative(process.cwd(), abs_path)
    },
    file_snippet : function(file, line) {
      var code = fs.readFileSync(file, { encoding : 'utf8' } );
      var lines = code.split("\n");

      CONTEXT = 4;
      var start = _.max([0, line - CONTEXT])
      var end = _.min([lines.length - 1, line + CONTEXT])
      return lines.slice(start, end).join('\n');
    },
    slug : slug
  }));
});

server.listen(3000);

// Store items by file, so when a file changes, only one list has to be updated
items_by_file = {}

// Check if a file should be ignored
function should_ignore(file_path, callback) {
  var rel_path = path.relative(process.cwd(), file_path)
  var child = exec("git check-ignore \"" + rel_path + "\"", function(error, stdout, stderr) {
    var result = (stdout.trim().length > 0) ? false : true;
    if(rel_path.indexOf(".git") != -1) result = false;
    callback(result);
  });
}

function scan(file_path) {
  console.log("Scanning " + file_path + "...")
  
  var result;
  try {
    data = fs.readFileSync(file_path, { encoding : 'utf8' } );
    result = todolist.findMarks(data);
    _.each(result, function(mark) {
      mark.file = path.relative(process.cwd(), file_path);
    })
  }
  catch(err) {
    console.log(err)
  }

  return result;
}

// TODO(rameshvarun): Use glob to prevent scanning of .git directories
var glob_pattern = ['**/*'];

// Walk initial directory structure, parsing all files
walk.walkSync(process.cwd(), function(base, filename, stat) {
  //TODO: Filter Glob here also
  if( !stat.isDirectory() ) {
    var absolute_path = path.join(base, filename)
    should_ignore(absolute_path, function(result) {
      if(result) {
        items_by_file[absolute_path] = scan(absolute_path)
      }
    })
  }
})

// Watch for changes
gaze(glob_pattern, function(error, watcher) {
  this.on('deleted', function(path) {
    delete items_by_file[path];
  });

  this.on('added', function(path) {
    should_ignore(path, function(result) {
      if(result)
        items_by_file[path] = scan(path);
    });
  });

  this.on('changed', function(path) {
    should_ignore(path, function(result) {
      if(result)
        items_by_file[path] = scan(path);
    });
  });
})

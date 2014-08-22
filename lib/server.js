

var http = require('http');
var swig = require('swig');
var path = require('path');
var gaze = require('gaze');
var walk = require('fs-walk');
var fs = require('fs');
var _ = require('underscore');
var exec = require('exec-queue');

var template = swig.compileFile(path.join(__dirname, 'template.html'));

var server = http.createServer(function (request, response) {
  response.writeHead(200, {"Content-Type": "text/html"});

  // Sort items by type, instead of by file
  items_by_type = {}

  // Sort items by assignee
  items_by_assignee = {}

  for(mark in marks) {
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
    }
  }));
});

server.listen(3000);



marks = {
  "FIXMEs" : /FIXME(\(.*\))?:(.*)/,
  "TODOs" : /TODO(\(.*\))?:(.*)/,
  "NOTEs" : /NOTE(\(.*\))?:(.*)/
}

// Store items by file, so when a file changes, only one list has to be updated
items_by_file = {}

// Check if a file should be ignored
function should_ignore(file_path, callback) {
  var rel_path = path.relative(process.cwd(), file_path)
  exec("git check-ignore \"" + rel_path + "\"", function(error, stdout, stderr) {
    var result = (stdout.indexOf(rel_path) > -1) ? false : true;
    callback(result);
  });
}

function scan(file_path) {
  console.log("Scanning " + file_path + "...")
  result = []

  try {
    data = fs.readFileSync(file_path, { encoding : 'utf8' } );
    data.split(/\r*\n/).map(function(line, index) {
      for(marktype in marks) {
        match = marks[marktype].exec(line)
        if(match) {
          // Extract assigneee
          var assignee = (match[1]) ? match[1].substring(1, match[1].length - 1).toLowerCase()  : null;

          result.push({
            content : match[0],
            line : index,
            file : file_path,
            assignee: assignee,
            type : marktype
          })
        }
      }
    })
  }
  catch(err) {
    console.log(err)
  }

  return result;
}

// Walk initial directory structure, parsing all files
walk.walkSync(process.cwd(), function(base, filename, stat) {
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
gaze('**/*', function(error, watcher) {
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

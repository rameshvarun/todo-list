var todolist = require("./lib");
var assert = require("assert");

describe('findMarks', function() {
  it('should find TODOs, NOTES, and FIXMEs', function() {
    var result = todolist.findMarks("// TODO: This is a TODO\n// NOTE: This is a Note\n// FIXME: This is a fixme.\n");
    assert.deepEqual(result,
      [{
        content: 'TODO: This is a TODO',
        line: 0,
        assignee: null,
        type: 'TODOs'
      },
        {
          content: 'NOTE: This is a Note',
          line: 1,
          assignee: null,
          type: 'NOTEs'
        },
        {
          content: 'FIXME: This is a fixme.',
          line: 2,
          assignee: null,
          type: 'FIXMEs'
      }]);
  });

  it('should parse the assignee of a task.', function() {
    var result = todolist.findMarks("// TODO(bob): This is a TODO assigned to bob.");
    console.log(result);
    assert.deepEqual(result,
      [{
        content: 'TODO(bob): This is a TODO assigned to bob.',
        line: 0,
        assignee: 'bob',
        type: 'TODOs'
      }]);
  });
});

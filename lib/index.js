var marks = {
  "FIXMEs" : /FIXME(\(.*\))?:(.*)/i,
  "TODOs" : /TODO(\(.*\))?:(.*)/i,
  "NOTEs" : /NOTE(\(.*\))?:(.*)/i
}
exports.marks = marks;

function findMarks(data) {
	var results = [];
	data.split(/\r*\n/).map(function(line, index) {
		for(marktype in marks) {
			match = marks[marktype].exec(line)
			if(match) {
				// Extract assigneee
				var assignee = (match[1]) ? match[1].substring(1, match[1].length - 1).toLowerCase()  : null;
				results.push({
					content : match[0],
					line : index,
					assignee: assignee,
					type : marktype
				})
			}
		}
	})
	return results;
}
exports.findMarks = findMarks;
// TODO:
// D draw lines with mouse
// D fix it so it works in Firefox
// D store lines in localStorage
// D namespace everything
// - add different colors
//   D make drawing be a list of line-drawing instructions instead of
//     a list of lines
//   - add two color change buttons (black and white)
//     - draw two rectangles at startup in a command area
//     - in mouse handlers, check to see if we are in the command
//       area; if so, invoke commands instead of drawing
//   - add color change instruction so that color change can be saved
//   - add current color indicator area
// - add different thicknesses (exponential pen sizes?)
//   - circular pens
// - add different opacities
// - add undo
// - add redo
// - make lines long enough to be sensibly antialiased
// - make localStorage memory-efficient
// - make localStorage linear-time
// - add triangle/circle color picker
// - add keyboard shortcuts: e for picking color from under the mouse,
//   z for undo, y for redo, [ for smaller brush, ] for larger brush,
//   < to increase opacity, > to decrease opacity, p for a palette
// - write a server-side so sketches can be shared
// - fix mouseup in the rest of the document

var capo =
    { mousePos: null
    , cx: null
    , offsetTop: null
    , offsetLeft: null
    , drawing: []

    , setup: function() {
        var cv = $('#c')
          , offset = cv.offset()

        capo.cx = cv[0].getContext('2d')
        capo.offsetTop = offset.top
        capo.offsetLeft = offset.left

        cv
        .mousedown(function(ev) { capo.mousePos = capo.evPos(ev) })
        .mouseup(function() { capo.mousePos = null })
        .mousemove(capo.mouseMoveHandler)

        capo.cx.strokeStyle = '1px solid black'

        capo.restoreDrawing(localStorage.currentDrawing)
      }

      // Argument is a nonempty string or null.
    , restoreDrawing: function(drawing) {
        if (!drawing) {
          return
        }

        capo.drawing = JSON.parse(drawing)
        for (var ii = 0; ii < capo.drawing.length; ii++) {
          var command = capo.drawing[ii]
          // Determine whether we need to schema-migrate.  Current
          // line command is like "L3 4 5 6"; previous version was
          // [{x: 3, y: 4}, {x: 5, y: 6}]; version before that was
          // [[3,4],[5,6]].
          if (command.charAt) {
            // No schema upgrade needed.
          } else {
            if (!command[0].x) {
              command[0] = capo.upgradePoint(command[0])
              command[1] = capo.upgradePoint(command[1])
            }
            // Now upgrade to the current format.
            var p0 = command[0]
              , p1 = command[1]

            command = "L"+[p0.x, p0.y, p1.x, p1.y].join(" ")
            capo.drawing[ii] = command
          }

          capo.run(command)
        }
      }

    , run: function(command) {
        // Currently all commands are line commands!
        if (command.charAt(0) !== 'L') {
          throw new Error(command)
        }

        capo.drawLine(command.substr(1).split(/ /))
      }

    , mouseMoveHandler: function(ev) {
        var oldPos = capo.mousePos
        if (oldPos === null) {
          return
        }

        var newPos = capo.evPos(ev)

        // Very simple front-end drawing simplification: if the
        // mouse has moved zero or one pixels, that’s not
        // enough.  Hopefully this is useful and not annoying.
        if (capo.manhattanDistance(oldPos, newPos) < 2) {
          return
        }

        var command = "L"+[oldPos.x, oldPos.y, newPos.x, newPos.y].join(" ")
        capo.run(command)
        capo.saveCommand(command)
        capo.mousePos = newPos
      }

    , drawLine: function(coords) {
        var cx = capo.cx
        cx.moveTo(coords[0], coords[1])
        cx.lineTo(coords[2], coords[3])
        cx.stroke()
      }

    , saveCommand: function(command) {
        capo.drawing.push(command)
        localStorage.currentDrawing = JSON.stringify(capo.drawing)
      }

    , evPos: function(ev) {
        return { x: ev.pageX - capo.offsetLeft
               , y: ev.pageY - capo.offsetTop
               }
      }

    , manhattanDistance: function(a, b) {
        return (Math.abs(a.x - b.x) +
                Math.abs(a.y - b.y))
      }

      // For drawings created in the first few hours of
      // development.
    , upgradePoint: function(point) {
        return { x: point[0], y: point[1] }
      }
    }

$(capo.setup) // for some reason Firefox can't getElementById before DOMContentLoaded

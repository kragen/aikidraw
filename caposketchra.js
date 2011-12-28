// TODO:
// D draw lines with mouse
// D fix it so it works in Firefox
// D store lines in localStorage
// D namespace everything
// - add different colors
//   - make drawing be a list of line-drawing instructions instead of
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

        var drawing = localStorage.getItem('currentDrawing')
        if (drawing) {
          capo.drawing = JSON.parse(drawing)
          capo.drawing.map(function(line) {
            if (!line[0].x) {
              line[0] = capo.upgradePoint(line[0])
              line[1] = capo.upgradePoint(line[1])
            }

            capo.drawLine(line[0], line[1])
          })
        }
      }

    , mouseMoveHandler: function(ev) {
        if (capo.mousePos === null) {
          return
        }

        var newPos = capo.evPos(ev)

        // Very simple front-end drawing simplification: if the
        // mouse has moved zero or one pixels, that’s not
        // enough.  Hopefully this is useful and not annoying.
        if (capo.manhattanDistance(capo.mousePos, newPos) < 2) {
          return
        }

        capo.addLine(capo.mousePos, newPos)
        capo.drawLine(capo.mousePos, newPos)
        capo.mousePos = newPos
      }

    , drawLine: function(oldPos, newPos) {
        var cx = capo.cx
        cx.moveTo(oldPos.x, oldPos.y)
        cx.lineTo(newPos.x, newPos.y)
        cx.stroke()
      }

    , addLine: function(oldPos, newPos) {
        capo.drawing.push([oldPos, newPos])
        localStorage.setItem('currentDrawing', JSON.stringify(capo.drawing))
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

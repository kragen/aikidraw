// TODO:
// D draw lines with mouse
// D fix it so it works in Firefox
// D store lines in localStorage
// D namespace everything
// D add different colors
//   D make drawing be a list of line-drawing instructions instead of
//     a list of lines
//   D add two color change buttons (black and white) in HTML
//   D add some more of them
//   D make them change the drawing color
//   D add color change instruction so that color change can be saved
//     D add a runAndSave function and use it for lines
//     D make colorbutton click handler call it too
//   D add current color indicator area
// D reorganize code
// - add different thicknesses (exponential pen sizes?)
//   D basic addition done
//   - circular pens
//   - redraw color indicator to indicate pen width
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
    , drawing: []
    , penSizes: [ 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256 ]

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

        $(document.body).keypress(capo.keyHandler)

        $('.colorbutton')
        .click(function(ev) {
          capo.runAndSave('c' + this.style.backgroundColor)
        })

        capo.setPenSize(1)
        capo.setColor('black')

        capo.restoreDrawing(localStorage.currentDrawing)
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

        capo.runAndSave("L"+[oldPos.x, oldPos.y, newPos.x, newPos.y].join(" "))
        capo.mousePos = newPos
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

    , keyHandler: function(ev) {
        if (ev.which === '['.charCodeAt(0)) {
          capo.switchToSmallerPen()
        } else if (ev.which === ']'.charCodeAt(0)) {
          capo.switchToLargerPen()
        }
      }

    , switchToSmallerPen: function() {
        var idx = capo.penSizes.indexOf(capo.penSize)

        // Do nothing if already at smallest pen size.
        if (idx === 0) {
          return
        }

        if (idx === -1) {       // Can’t happen!
          idx = 0
        } else {
          idx--
        }

        capo.runAndSave('s' + capo.penSizes[idx])
      }

    , switchToLargerPen: function() {
        var idx = capo.penSizes.indexOf(capo.penSize)

        if (idx === capo.penSizes.length - 1) {
          return
        }

        idx++

        capo.runAndSave('s' + capo.penSizes[idx])
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

      // For drawings created in the first few hours of
      // development.
    , upgradePoint: function(point) {
        return { x: point[0], y: point[1] }
      }

    , runAndSave: function(command) {
        capo.run(command)
        capo.saveCommand(command)
      }

    , run: function(command) {
        var type = command.charAt(0)
        if (type === 'L') {
          capo.drawLine(command.substr(1).split(/ /))
        } else if (type === 'c') {
          capo.setColor(command.substr(1))
        } else if (type === 's') {
          capo.setPenSize(+command.substr(1))
        } else {
          throw new Error(command)
        }
      }

    , drawLine: function(coords) {
        var cx = capo.cx
        cx.beginPath()
        cx.moveTo(coords[0], coords[1])
        cx.lineTo(coords[2], coords[3])
        cx.stroke()
      }

    , setColor: function(color) {
        capo.cx.strokeStyle = color
        $('.colordisplay').css('background-color', color)
      }

    , setPenSize: function(penSize) {
        window.console && console.log(penSize)
        capo.cx.lineWidth = capo.penSize = penSize
      }

    , saveCommand: function(command) {
        capo.drawing.push(command)
        localStorage.currentDrawing = JSON.stringify(capo.drawing)
      }
    }

$(capo.setup) // for some reason Firefox can't getElementById before DOMContentLoaded

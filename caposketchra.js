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
// D add different thicknesses (exponential pen sizes?)
//   D basic addition done
//   D circular pens
// D add different opacities
//   D added basic opacity, but now need to
// D find out how to get image data from the canvas, needed for two
//   things: the e eyedropper color picker, and faster redraws after
//   undo or editing an existing stroke.  I *could* use
//   canvas.toDataURL to take snapshots but I’d rather not.  Aha,
//   getImageData() returns a snapshot, putImageData(snapshot, 0, 0)
//   restores, and the imagedata itself is an RGBA 8-bit array on the
//   property .data.
// D add undo
// D add redo
// D make keys work in Firefox!  WTF is wrong?  oh, you have to listen
//   on document, not document.body, for unfocused keypresses.
// D add eyedropper color picker
// D fix mouseup in the rest of the document
// D add keyboard shortcuts: e for picking color from under the mouse,
//   z for undo, y for redo, [ for smaller brush, ] for larger brush,
//   < to increase opacity, > to decrease opacity
// - use , penSizes: [ 1, 2, 4, 8, 16, 32, 64, 128 ]
// - opacity controls backwards; fix them. allow , and . instead of < and >
// - don't go fully transparent
// - quickly kludge out the save-on-mouse-up thing
// - make localStorage linear-time
// - add buttons to change pen size
// - redraw color indicator to indicate pen size
// - redraw color indicator to indicate opacity
// - Redraw with snapshots.  The imagedata being RGBA 8-bit means
//   512x512 is a meg of memory down the drain, so we probably don’t
//   want to save more than about 30 of those snapshots.  (Although 
//   a PNG from .toDataURL() was only 215K.)   This will
//   enable the stroke drawing code to be totally revamped so that
//   you’re drawing entire multi-line strokes instead of bunches of
//   individual lines, which will also accomplish the following:
//   - make undo undo more than a single pixel’s worth at a time
//   - make undo reasonably efficient on large drawings
//   - totally revamp stroke drawing code to stop putting blots in the
//     middle of translucent lines.
// - add buttons to change opacity
// - save redo stack persistently!
// - make eyedropper work properly with respect to alpha!
// - make lines long enough to be sensibly antialiased
// - make localStorage memory-efficient
// - add triangle/circle color picker
// - add keyboard shortcut: p for a palette
// - write a server-side so sketches can be shared
// - add timed replay
// - record delays for replay

var capo =
    { drawPos: null
    , mousePos: { x: 0, y: 0 }
    , drawing: []
    , penSizes: [ 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256 ]
    , redoStack: []
    , pendingRedraw: null

    , setup: function() {
        var cv = $('#c')
          , offset = cv.offset()

        capo.cx = cv[0].getContext('2d')
        capo.offsetTop = offset.top
        capo.offsetLeft = offset.left
        capo.width = cv[0].width
        capo.height = cv[0].height

        cv
        .mousedown(function(ev) { capo.drawPos = capo.evPos(ev) })
        .mousemove(capo.mouseMoveHandler)

        $(document)
        .keypress(capo.keyHandler)
        .mouseup(function() { capo.drawPos = null })

        $('.colorbutton')
        .click(function(ev) {
          capo.runAndSave('c' + this.style.backgroundColor)
        })

        if (localStorage.currentDrawing) {
          capo.drawing = JSON.parse(localStorage.currentDrawing)
        }
        capo.redraw()
      }

    , mouseMoveHandler: function(ev) {
        var newPos = capo.evPos(ev)
        capo.mousePos = newPos

        var oldPos = capo.drawPos
        if (oldPos === null) {
          return
        }

        // Very simple front-end drawing simplification: if the
        // mouse has moved zero or one pixels, that’s not
        // enough.  Hopefully this is useful and not annoying.
        if (capo.manhattanDistance(oldPos, newPos) < 2) {
          return
        }

        capo.runAndSave("L"+[oldPos.x, oldPos.y, newPos.x, newPos.y].join(" "))
        capo.drawPos = newPos
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
        var c = String.fromCharCode(ev.which)
        if (c === '[') {
          capo.switchToSmallerPen()
        } else if (c === ']') {
          capo.switchToLargerPen()
        } else if (c === '<') {
          capo.increaseOpacity()
        } else if (c === '>') {
          capo.decreaseOpacity()
        } else if (c === 'z') {
          capo.undo()
        } else if (c === 'y') {
          capo.redo()
        } else if (c === 'e') {
          capo.pickColorFromImage()
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

    , increaseOpacity: function() {
        var opacity = Math.min(1, capo.opacity + 0.125)
        capo.runAndSave('a' + opacity)
      }

    , decreaseOpacity: function() {
        var opacity = Math.max(0, capo.opacity - 0.125)
        capo.runAndSave('a' + opacity)
      }

    , undo: function() {
        if (!capo.drawing.length) {
          return
        }

        var command = capo.drawing.pop()
        capo.redoStack.push(command)
        if (capo.pendingRedraw) {
          clearTimeout(capo.pendingRedraw)
        }
        capo.pendingRedraw = setTimeout(capo.redraw, 150)
      }

    , redo: function() {
        if (!capo.redoStack.length) {
          return
        }

        capo.runAndSave(capo.redoStack.pop())
      }

      // “Eyedropper” functionality
    , pickColorFromImage: function() {
        var pix = capo.cx.getImageData(capo.mousePos.x, capo.mousePos.y, 1, 1)
          , pd = pix.data
          , rgbstr = [pd[0], pd[1], pd[2]].join(',')
          , color = 'rgb('+rgbstr+')'

        capo.runAndSave('c' + color)
      }

    , redraw: function() {
        capo.pendingRedraw = null
        capo.setPenSize(1)
        capo.setColor('black')
        capo.setOpacity(1.0)

        var cx = capo.cx
          , drawing = capo.drawing

        cx.lineCap = 'round'
        cx.lineJoin = 'round'
        cx.clearRect(0, 0, capo.width, capo.height)

        for (var ii = 0; ii < drawing.length; ii++) {
          var command = drawing[ii]
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
            drawing[ii] = command
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
          , args = command.substr(1)
        if (type === 'L') {
          capo.drawLine(args.split(/ /))
        } else if (type === 'c') {
          capo.setColor(args)
        } else if (type === 's') {
          capo.setPenSize(+args)
        } else if (type === 'a') {
          capo.setOpacity(+args)
        } else {
          throw new Error(command)
        }
      }

    , drawLine: function(coords) {
        var cx = capo.cx
          , x0 = coords[0]
          , y0 = coords[1]
          , x1 = coords[2]
          , y1 = coords[3]

        cx.beginPath()
        cx.moveTo(x0, y0)
        cx.lineTo(x1, y1)
        cx.stroke()
      }

    , setColor: function(color) {
        capo.cx.strokeStyle = capo.cx.fillStyle = color
        $('.colordisplay').css('background-color', color)
      }

    , setPenSize: function(penSize) {
        capo.cx.lineWidth = capo.penSize = penSize
      }

    , setOpacity: function(opacity) {
        if (isNaN(opacity)) {
          opacity = 1.0
        }

        capo.opacity = capo.cx.globalAlpha = opacity
      }

    , saveCommand: function(command) {
        capo.drawing.push(command)
        localStorage.currentDrawing = JSON.stringify(capo.drawing)
      }
    }

$(capo.setup) // for some reason Firefox can't getElementById before DOMContentLoaded

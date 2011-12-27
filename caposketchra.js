// TODO:
// D draw lines with mouse
// - store lines in localStorage

var cv = document.getElementById('c')
  , cx = cv.getContext('2d')
  , mousePos = null

cv.addEventListener('mousedown', function(ev) { mousePos = evPos(ev) } )
cv.addEventListener('mouseup', function() { mousePos = null })
cv.addEventListener('mousemove', mouseMoveHandler)

cx.strokeStyle = '1px solid black'

function mouseMoveHandler(ev) {
  if (mousePos === null) {
    return
  }

  var newPos = evPos(ev)

  cx.moveTo(mousePos[0], mousePos[1])
  cx.lineTo(newPos[0], newPos[1])
  cx.stroke()

  mousePos = newPos
}

function evPos(ev) {
  return [ev.offsetX, ev.offsetY]
}
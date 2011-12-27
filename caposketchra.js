// TODO:
// D draw lines with mouse
// D fix it so it works in Firefox
// - store lines in localStorage

var mousePos = null
  , cx = null
  , offsetTop = null
  , offsetLeft = null

$(function() {
  var cv = $('#c')
    , offset = cv.offset()

  cx = cv[0].getContext('2d')
  offsetTop = offset.top
  offsetLeft = offset.left

  cv
  .mousedown(function(ev) { mousePos = evPos(ev) })
  .mouseup(function() { mousePos = null })
  .mousemove(mouseMoveHandler)

  cx.strokeStyle = '1px solid black'
})

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
  return [ev.pageX - offsetLeft, ev.pageY - offsetTop]
}
'use strict'

/* definitions */

let search = document.getElementById('search')
let date = new Date()
let weekShift = 0
let subsData = {subs: []}, planData = {tables: []}

let ac = {
  source: function(val, suggest) {
    fetch('names.json?name=' + val).then(function(resp) {
      return resp.json()
    }).then(function(data) {
      suggest(data.names)
    })
  },
  minChars: 3,
  delay: 0,
  cache: 1,
  renderItem: function (item, search){
    // escape special characters
    search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    let re = new RegExp('(' + search.split(' ').join('|') + ')', 'gi')
    return '<div class="ac-s" data-val="' + item + '">' + item.replace(re, '<span class="hl">$1</span>') + '</div>'
  },
  onSelect: function(e, term, item){
    document.body.classList.remove('typing')
    search.value = term
    window.localStorage.setItem('selected', search.value)
    fetch('subs.json?group=' + group())
    fetch('plan.json?name=' + search.value).then(function(resp) {
      return resp.json()
    }).then(function(data) {
      planData = data
      renderData()
    })
  }
}

/* actions */

search.value = window.localStorage.getItem('selected')

if (document.body.classList.contains('nodata')) {
  if (search.value) {
    Promise.all([
      fetch('plan.json?name=' + search.value).then(function(resp) {
        return resp.json()
      }).then(function(data) {
        planData = data
      }),
      fetch('subs.json?group=' + group()).then(function(resp) {
        return resp.json()
      }).then(function(data) {
        subsData = data
      })
    ]).then(function() {
      renderData()
    })
  } else {
    search.focus()
  }
} else {
  highlights()
  Promise.all([
    fetch('plan.json?name=' + search.value),
    fetch('subs.json?group=' + group())
  ])/*.catch(function() {
    document.body.classList.add('offline')
  })*/
}

if (!navigator.onLine) document.body.classList.add('offline')

/* events */

document.getElementById('clear').onclick = function clear() {
  search.value = ''
  search.focus()
}

document.getElementById('searchicon').onclick = function clear() {
  search.focus()
}

search.onblur = function() {
  document.body.classList.remove('typing')
}

window.addEventListener('online', function () {
  document.body.classList.remove('offline')
})

window.addEventListener('offline', function () {
  document.body.classList.add('offline')
})

document.getElementById('lastweek').onclick = function () {
  weekShift++
  highlights()
}

document.getElementById('nextweek').onclick = function () {
  weekShift++
  highlights()
}

/* functions */

function group() {
  try {
    return search.value.split('(')[1].split('-')[0]
  } catch (err) {
    return ''
  }
}

function renderData() {
  renderPlan()
  renderSubs()
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(JSON.stringify({
      type: 'prerender',
      content: document.documentElement.outerHTML
    }))
  }
  highlights()
}

function highlights() {
  date = new Date()
  date.setHours(date.getHours() + 8)
  if (date.getDay() === 6) date.setHours(date.getHours() + 24)
  if (date.getDay() === 0) date.setHours(date.getHours() + 24)
  let onejan = new Date(date.getFullYear(), 0, 1)
  let week = Math.ceil((((date - onejan) / 86400000) + onejan.getDay() + 1) / 7) % 2
  let day = date.getDay() - 1
  document.getElementById('table-' + week).childNodes.forEach(function(child) {
    child.childNodes[day+1].classList.add('today')
  })
  date.setDate(date.getDate() + weekShift * 7)
  onejan = new Date(date.getFullYear(), 0, 1)
  week = Math.ceil((((date - onejan) / 86400000) + onejan.getDay() + 1) / 7) % 2
  document.getElementById('plan-' + week).classList.add('thisweek')
  document.getElementById('plan-' + ((week+1)%2)).classList.remove('thisweek')
  //document.getElementById('spacer').innerHTML = 'Woche ' + week ? 'B' : 'A'
}

function renderPlan() {
  let tables = planData.tables[search.value] || []

  for (let week = 0; week < tables.length; week++) {
    let max = 0
    for (let hr in tables[week]) {
      for (let day in tables[week][hr]) {
        if (tables[week][hr][day] !== '' && hr > max) max = hr
      }
    }
    max++

    let table = document.getElementById('table-' + week)
    table.innerHTML = '<tr><th class="hour"></th><th>Mo</th><th>Di</th><th>Mi</th><th>Do</th><th>Fr</th></tr>'
    for (let hr = 0; hr < max; hr++) {
      let tr = document.createElement('tr')
      let hour = document.createElement('td')
      hour.classList.add('hour')
      hour.innerHTML = hr+1
      tr.appendChild(hour)
      for (let day = 0; day < tables[week][hr].length; day++) {
        let td = document.createElement('td')
        td.innerHTML = tables[week][hr][day]
        tr.appendChild(td)
      }
      table.appendChild(tr)
    }
  }

  //document.getElementById('plan-lastfetch').innerHTML = formatDate(new Date())
  document.getElementById('plan-lastupdate').innerHTML = formatDate(new Date(planData.date))
  document.body.classList.remove('nodata')
  search.blur()
  
  document.getElementById('ac-ss').innerHTML = ''
}

function formatDate(date) {
  return '' + date.getDate() + '.' + (date.getMonth()+1) + '.' +  date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes() + ' Uhr'
}

function renderSubs() {
  for (let sub of subsData.subs) {
    try {
      let table = document.getElementById('table-' + sub[7])
      let tr = table.childNodes[sub[8]]
      if (!tr) continue
      let td = tr.childNodes[sub[9]+1]
      let plan = td.innerHTML.split(' ')
      if (group() == sub[0] && (plan[1] == sub[2] || plan[2] == sub[1])) {
        td.classList.add(sub[5])
        if (sub[5] === 'covered') {
          plan[3] = '<span class="strike">' + plan[3] + '</span>'
          td.innerHTML = plan.join(' ') + ' ' + sub[4]
        }
      }
    } catch (err) {
      console.log(err)
    }
  }
  //document.getElementById('subs-lastfetch').innerHTML = formatDate(new Date())
  //document.getElementById('subs-lastupdate').innerHTML = formatDate(new Date(data.date))
}

/*
  JavaScript autoComplete v1.0.4
  Copyright (c) 2014 Simon Steinberger / Pixabay
  GitHub: https://github.com/Pixabay/JavaScript-autoComplete
  License: http://www.opensource.org/licenses/mit-license.php
*/

function autoComplete(o){
  for (let k in o) {
    this[k] = ac[k]
  }

  function addEvent(el, type, handler){
    if (el.attachEvent) el.attachEvent('on'+type, handler); else el.addEventListener(type, handler)
  }
  function removeEvent(el, type, handler){
    // if (el.removeEventListener) not working in IE11
    if (el.detachEvent) el.detachEvent('on'+type, handler); else el.removeEventListener(type, handler)
  }
  function live(elClass, event, cb, context){
    addEvent(context || document, event, function(e){
      let found, el = e.target || e.srcElement
      while (el && !(found = el.classList.contains(elClass))) el = el.parentElement
      if (found) cb.call(el, e)
    })
  }

  let that = search

  that.sc = document.getElementById('ac-ss')

  that.cache = {}
  that.last_val = ''
  document.body.appendChild(that.sc)

  live('ac-s', 'mouseleave', function(e){
    let sel = that.sc.querySelector('.ac-s.s')
    if (sel) setTimeout(function(){ sel.classList.remove('s'); }, 20)
  }, that.sc)

  live('ac-s', 'mouseover', function(e){
    let sel = that.sc.querySelector('.ac-s.s')
    if (sel) sel.classList.remove('s')
    this.classList.add('s')
  }, that.sc)

  live('ac-s', 'mousedown', function(e){
    if (this.classList.contains('ac-s')) { // else outside click
      let v = this.getAttribute('data-val')
      that.value = v
      ac.onSelect(e, v, this)
    }
  }, that.sc)

  let suggest = function(data){
    let val = that.value
    that.cache[val] = data
    if (data.length && val.length >= ac.minChars) {
      let s = ''
      for (let i=0;i<data.length;i++) s += ac.renderItem(data[i], val)
      that.sc.innerHTML = s
      document.body.classList.add('typing')
    }
    else
      that.sc.innerHTML = ''
  }

  that.keydownHandler = function(e){
    let key = window.event ? e.keyCode : e.which
    // down (40), up (38)
    if (key == 9) {
      e.preventDefault()
      key = 40
    }
    if ((key == 40 || key == 38) && that.sc.innerHTML) {
      let next, sel = that.sc.querySelector('.ac-s.s')
      if (!sel) {
        next = (key == 40) ? that.sc.querySelector('.ac-s') : that.sc.childNodes[that.sc.childNodes.length - 1]; // first : last
        next.classList.add('s')
      } else {
        next = (key == 40) ? sel.nextSibling : sel.previousSibling
        if (next) {
          sel.classList.remove('s')
          next.classList.add('s')
        }
        else { sel.classList.remove('s'); that.value = that.last_val; next = 0; }
      }
      document.body.classList.add('typing')

      return false
    }
    // esc
    else if (key == 27) { that.value = that.last_val; that.blur(); }
    // enter
    else if (key == 13 || key == 9) {
      if (document.body.classList.contains('typing')) {
        let sel = that.sc.querySelector('.ac-s.s') || that.sc.firstChild
        ac.onSelect(e, sel.getAttribute('data-val'), sel);
      }
    }
  }
  addEvent(that, 'keydown', that.keydownHandler)

  that.keyupHandler = function(e){
    let key = window.event ? e.keyCode : e.which
    if (!key || (key < 35 || key > 40) && key != 13 && key != 27) {
      let val = that.value
      if (val.length >= ac.minChars) {
        if (val != that.last_val) {
          that.last_val = val
          clearTimeout(that.timer)
          if (ac.cache) {
            if (val in that.cache) { suggest(that.cache[val]); return; }
            // no requests if previous ss were empty
            for (let i=1; i<val.length-ac.minChars; i++) {
              let part = val.slice(0, val.length-i)
              if (part in that.cache && !that.cache[part].length) { suggest([]); return; }
            }
          }
          that.timer = setTimeout(function(){ ac.source(val, suggest) }, ac.delay)
        }
      } else {
        that.last_val = val
        document.body.classList.remove('typing')
      }
    }
  }
  addEvent(that, 'keyup', that.keyupHandler)

  that.focusHandler = function(e){
    that.last_val = '\n'
    that.keyupHandler(e)
  }
  if (!ac.minChars) addEvent(that, 'focus', that.focusHandler)
  
}

autoComplete()

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', {
    scope: './'
  })

  navigator.serviceWorker.onmessage = function(evt) {
    let data = JSON.parse(evt.data)
    if (data.tables) {
      planData = data
    } else if (data.subs) {
      subsData = data
    }
    renderData()
  }
}

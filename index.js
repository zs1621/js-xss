/**
 * 过滤XSS攻击
 *
 * @author 老雷<leizongmin@gmail.com>
 */

/*
 * 默认HTML标签白名单
 * 标签名=>属性列表
 */
var defaultWhiteList = {
  h1:     ['style', 'class'],
  h2:     ['style', 'class'],
  h3:     ['style', 'class'],
  h4:     ['style', 'class'],
  h5:     ['style', 'class'],
  hr:     ['style', 'class'],
  span:   ['style', 'class'],
  strong: ['style', 'class'],
  b:      ['style', 'class'],
  i:      ['style', 'class'],
  p:      ['style', 'class'],
  pre:    ['style', 'class'],
  code:   ['style', 'class'],
  a:      ['style', 'class', 'target', 'href', 'title'],
  img:    ['style', 'class', 'src', 'alt', 'title'],
  div:    ['style', 'class'],
  table:  ['style', 'class', 'width', 'border'],
  tr:     ['style', 'class'],
  td:     ['style', 'class', 'width', 'colspan'],
  th:     ['style', 'class', 'width', 'colspan'],
  tbody:  ['style', 'class'],
};


/**
 * XSS过滤
 *
 * @param {string} html 要过滤的HTML代码
 * @param {object} whiteList 白名单，若不指定，则使用默认的
 * @param {function} onTagAttr 指定此回调用于处理属性值，格式：function (tagName, attrName, attrValue)
 *                             若要改变该值，返回新的值即可，否则不用返回任何值
 * @return {string}
 */
var xss = module.exports = function (html, whiteList, onTagAttr) {
  'use strict';

  if (typeof(whiteList) === 'function') {
    onTagAttr = whiteList;
    whiteList = defaultWhiteList;
  } else {
    whiteList = whiteList || exports.whiteList;
    onTagAttr = function () {};
  }

  var rethtml = '';
  var lastPos = 0;
  var tagStart = false;
  var quoteStart = false;

  /**
   * 转换<>为&lt; &gt
   */
  var noTag = function (text) {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * 过滤不合法的属性
   */
  var filterAttributes = function (tagName, attrs) {
    tagName = tagName.toLowerCase();
    var whites = whiteList[tagName];
    var lastPos = 0;
    var _attrs = [];
    var tmpName = false;
    function addAttr (name, value) {
      name = name.toLowerCase().trim();
      if (value) {
        value = value.trim();
        var newValue = onTagAttr(tagName, name, value);
        if (typeof(newValue) !== 'undefined') {
          value = newValue;
        }
      }
      if (whites.indexOf(name) !== -1) {
        _attrs.push(name + (value ? '="' + value + '"' : ''));
      }
    }
    for (var i = 0, len = attrs.length; i < len; i++) {
      var c = attrs[i];
      if (c === '=') {
        tmpName = attrs.slice(lastPos, i);
        lastPos = i + 1;
        continue;
      }
      if (tmpName !== false) {
        if (c === '"' || c === "'") {
          var j = attrs.indexOf(c, i + 1);
          if (j === -1) {
            break;
          } else {
            var v = attrs.slice(lastPos + 1, j).trim();
            addAttr(tmpName, v);
            tmpName = false;
            i = j;
            lastPos = i + 1;
            continue;
          }
        }
      } else {
        if (c === ' ') {
          var v = attrs.slice(lastPos, i).trim();
          addAttr(v);
          tmpName = false;
          lastPos = i + 1;
          continue;
        }
      }
    }
    if (lastPos < attrs.length) {
      addAttr(attrs.slice(lastPos));
    }
    return _attrs.join(' ');
  };

  /**
   * 检查标签是否合法
   */
  var addNewTag = function (tag, end) {
    rethtml += noTag(html.slice(lastPos, tagStart));
    lastPos = end + 1;
    var spos = tag.slice(0, 2) === '</' ? 2 : 1;
    
    var i = tag.indexOf(' ');
    if (i === -1) {
      var tagName = tag.slice(spos, tag.length - 1).trim();
    } else {
      var tagName = tag.slice(spos, i + 1).trim();
    }
    if (tagName in whiteList) {
      // 过滤不合法的属性
      if (i === -1) {
        rethtml += tag.slice(0, spos) + tagName + '>';
      } else {
        var attrs = filterAttributes(tagName, tag.slice(i + 1, tag.length - 1).trim());
        rethtml += tag.slice(0, spos) + tagName + (attrs.length > 0 ? ' ' + attrs : '') + '>';
      }
    } else {
      // 过滤 <>
      rethtml += noTag(tag);
    }
  };

  // 逐个分析字符
  for (var i = 0, len = html.length; i < len; i++) {
    var c = html[i];
    if (tagStart === false) {
      if (c === '<') {
        tagStart = i;
        continue;
      }
    } else {
      if (quoteStart === false) {
        if (c === '<') {
          rethtml += noTag(html.slice(lastPos, i));
          tagStart = i;
          lastPos = i;
          continue;
        }
        if (c === '>') {
          addNewTag(html.slice(tagStart, i + 1), i);
          tagStart = false;
          continue;
        }
        if (c === '"' || c === "'") {
          quoteStart = c;
          continue;
        }
      } else {
        if (c === quoteStart) {
          quoteStart = false;
          continue;
        }
      }
    }
  }
  if (lastPos < html.length) {
    rethtml += noTag(html.substr(lastPos));
  }
  return rethtml;
};

exports.whiteList = defaultWhiteList;
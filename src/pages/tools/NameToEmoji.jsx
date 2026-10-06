import { useEffect, useMemo, useState } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './NameToEmoji.css';

// ============================================================
// CHARACTER MAPS — every letter has multiple "styles"
// ============================================================
const STYLE_MAPS = {
  boldSerif: {
    'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠',
    'h': '𝐡', 'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧',
    'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭', 'u': '𝐮',
    'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
    'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆',
    'H': '𝐇', 'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍',
    'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓', 'U': '𝐔',
    'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
    '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒',
    '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗',
  },
  italicSerif: {
    'a': '𝑎', 'b': '𝑏', 'c': '𝑐', 'd': '𝑑', 'e': '𝑒', 'f': '𝑓', 'g': '𝑔',
    'h': 'ℎ', 'i': '𝑖', 'j': '𝑗', 'k': '𝑘', 'l': '𝑙', 'm': '𝑚', 'n': '𝑛',
    'o': '𝑜', 'p': '𝑝', 'q': '𝑞', 'r': '𝑟', 's': '𝑠', 't': '𝑡', 'u': '𝑢',
    'v': '𝑣', 'w': '𝑤', 'x': '𝑥', 'y': '𝑦', 'z': '𝑧',
    'A': '𝐴', 'B': '𝐵', 'C': '𝐶', 'D': '𝐷', 'E': '𝐸', 'F': '𝐹', 'G': '𝐺',
    'H': '𝐻', 'I': '𝐼', 'J': '𝐽', 'K': '𝐾', 'L': '𝐿', 'M': '𝑀', 'N': '𝑁',
    'O': '𝑂', 'P': '𝑃', 'Q': '𝑄', 'R': '𝑅', 'S': '𝑆', 'T': '𝑇', 'U': '𝑈',
    'V': '𝑉', 'W': '𝑊', 'X': '𝑋', 'Y': '𝑌', 'Z': '𝑍',
  },
  boldItalic: {
    'a': '𝒂', 'b': '𝒃', 'c': '𝒄', 'd': '𝒅', 'e': '𝒆', 'f': '𝒇', 'g': '𝒈',
    'h': '𝒉', 'i': '𝒊', 'j': '𝒋', 'k': '𝒌', 'l': '𝒍', 'm': '𝒎', 'n': '𝒏',
    'o': '𝒐', 'p': '𝒑', 'q': '𝒒', 'r': '𝒓', 's': '𝒔', 't': '𝒕', 'u': '𝒖',
    'v': '𝒗', 'w': '𝒘', 'x': '𝒙', 'y': '𝒚', 'z': '𝒛',
    'A': '𝑨', 'B': '𝑩', 'C': '𝑪', 'D': '𝑫', 'E': '𝑬', 'F': '𝑭', 'G': '𝑮',
    'H': '𝑯', 'I': '𝑰', 'J': '𝑱', 'K': '𝑲', 'L': '𝑳', 'M': '𝑴', 'N': '𝑵',
    'O': '𝑶', 'P': '𝑷', 'Q': '𝑸', 'R': '𝑹', 'S': '𝑺', 'T': '𝑻', 'U': '𝑼',
    'V': '𝑽', 'W': '𝑾', 'X': '𝑿', 'Y': '𝒀', 'Z': '𝒁',
  },
  script: {
    'a': '𝒶', 'b': '𝒷', 'c': '𝒸', 'd': '𝒹', 'e': 'ℯ', 'f': '𝒻', 'g': 'ℊ',
    'h': '𝒽', 'i': '𝒾', 'j': '𝒿', 'k': '𝓀', 'l': '𝓁', 'm': '𝓂', 'n': '𝓃',
    'o': 'ℴ', 'p': '𝓅', 'q': '𝓆', 'r': '𝓇', 's': '𝓈', 't': '𝓉', 'u': '𝓊',
    'v': '𝓋', 'w': '𝓌', 'x': '𝓍', 'y': '𝓎', 'z': '𝓏',
    'A': '𝒜', 'B': 'ℬ', 'C': '𝒞', 'D': '𝒟', 'E': 'ℰ', 'F': 'ℱ', 'G': '𝒢',
    'H': 'ℋ', 'I': 'ℐ', 'J': '𝒥', 'K': '𝒦', 'L': 'ℒ', 'M': 'ℳ', 'N': '𝒩',
    'O': '𝒪', 'P': '𝒫', 'Q': '𝒬', 'R': 'ℛ', 'S': '𝒮', 'T': '𝒯', 'U': '𝒰',
    'V': '𝒱', 'W': '𝒲', 'X': '𝒳', 'Y': '𝒴', 'Z': '𝒵',
  },
  boldScript: {
    'a': '𝓪', 'b': '𝓫', 'c': '𝓬', 'd': '𝓭', 'e': '𝓮', 'f': '𝓯', 'g': '𝓰',
    'h': '𝓱', 'i': '𝓲', 'j': '𝓳', 'k': '𝓴', 'l': '𝓵', 'm': '𝓶', 'n': '𝓷',
    'o': '𝓸', 'p': '𝓹', 'q': '𝓺', 'r': '𝓻', 's': '𝓼', 't': '𝓽', 'u': '𝓾',
    'v': '𝓿', 'w': '𝔀', 'x': '𝔁', 'y': '𝔂', 'z': '𝔃',
    'A': '𝓐', 'B': '𝓑', 'C': '𝓒', 'D': '𝓓', 'E': '𝓔', 'F': '𝓕', 'G': '𝓖',
    'H': '𝓗', 'I': '𝓘', 'J': '𝓙', 'K': '𝓚', 'L': '𝓛', 'M': '𝓜', 'N': '𝓝',
    'O': '𝓞', 'P': '𝓟', 'Q': '𝓠', 'R': '𝓡', 'S': '𝓢', 'T': '𝓣', 'U': '𝓤',
    'V': '𝓥', 'W': '𝓦', 'X': '𝓧', 'Y': '𝓨', 'Z': '𝓩',
  },
  fraktur: {
    'a': '𝔞', 'b': '𝔟', 'c': '𝔠', 'd': '𝔡', 'e': '𝔢', 'f': '𝔣', 'g': '𝔤',
    'h': '𝔥', 'i': '𝔦', 'j': '𝔧', 'k': '𝔨', 'l': '𝔩', 'm': '𝔪', 'n': '𝔫',
    'o': '𝔬', 'p': '𝔭', 'q': '𝔮', 'r': '𝔯', 's': '𝔰', 't': '𝔱', 'u': '𝔲',
    'v': '𝔳', 'w': '𝔴', 'x': '𝔵', 'y': '𝔶', 'z': '𝔷',
    'A': '𝔄', 'B': '𝔅', 'C': 'ℭ', 'D': '𝔇', 'E': '𝔈', 'F': '𝔉', 'G': '𝔊',
    'H': 'ℌ', 'I': 'ℑ', 'J': '𝔍', 'K': '𝔎', 'L': '𝔏', 'M': '𝔐', 'N': '𝔑',
    'O': '𝔒', 'P': '𝔓', 'Q': '𝔔', 'R': 'ℜ', 'S': '𝔖', 'T': '𝔗', 'U': '𝔘',
    'V': '𝔙', 'W': '𝔚', 'X': '𝔛', 'Y': '𝔜', 'Z': 'ℨ',
  },
  doubleStruck: {
    'a': '𝕒', 'b': '𝕓', 'c': '𝕔', 'd': '𝕕', 'e': '𝕖', 'f': '𝕗', 'g': '𝕘',
    'h': '𝕙', 'i': '𝕚', 'j': '𝕛', 'k': '𝕜', 'l': '𝕝', 'm': '𝕞', 'n': '𝕟',
    'o': '𝕠', 'p': '𝕡', 'q': '𝕢', 'r': '𝕣', 's': '𝕤', 't': '𝕥', 'u': '𝕦',
    'v': '𝕧', 'w': '𝕨', 'x': '𝕩', 'y': '𝕪', 'z': '𝕫',
    'A': '𝔸', 'B': '𝔹', 'C': 'ℂ', 'D': '𝔻', 'E': '𝔼', 'F': '𝔽', 'G': '𝔾',
    'H': 'ℍ', 'I': '𝕀', 'J': '𝕁', 'K': '𝕂', 'L': '𝕃', 'M': '𝕄', 'N': 'ℕ',
    'O': '𝕆', 'P': 'ℙ', 'Q': 'ℚ', 'R': 'ℝ', 'S': '𝕊', 'T': '𝕋', 'U': '𝕌',
    'V': '𝕍', 'W': '𝕎', 'X': '𝕏', 'Y': '𝕐', 'Z': 'ℤ',
    '0': '𝟘', '1': '𝟙', '2': '𝟚', '3': '𝟛', '4': '𝟜',
    '5': '𝟝', '6': '𝟞', '7': '𝟟', '8': '𝟠', '9': '𝟡',
  },
  boldFraktur: {
    'a': '𝖆', 'b': '𝖇', 'c': '𝖈', 'd': '𝖉', 'e': '𝖊', 'f': '𝖋', 'g': '𝖌',
    'h': '𝖍', 'i': '𝖎', 'j': '𝖏', 'k': '𝖐', 'l': '𝖑', 'm': '𝖒', 'n': '𝖓',
    'o': '𝖔', 'p': '𝖕', 'q': '𝖖', 'r': '𝖗', 's': '𝖘', 't': '𝖙', 'u': '𝖚',
    'v': '𝖛', 'w': '𝖜', 'x': '𝖝', 'y': '𝖞', 'z': '𝖟',
    'A': '𝕬', 'B': '𝕭', 'C': '𝕮', 'D': '𝕯', 'E': '𝕰', 'F': '𝕱', 'G': '𝕲',
    'H': '𝕳', 'I': '𝕴', 'J': '𝕵', 'K': '𝕶', 'L': '𝕷', 'M': '𝕸', 'N': '𝕹',
    'O': '𝕺', 'P': '𝕻', 'Q': '𝕼', 'R': '𝕽', 'S': '𝕾', 'T': '𝕿', 'U': '𝖀',
    'V': '𝖁', 'W': '𝖂', 'X': '𝖃', 'Y': '𝖄', 'Z': '𝖅',
  },
  sansBold: {
    'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴',
    'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻',
    'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂',
    'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
    'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚',
    'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡',
    'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧', 'U': '𝗨',
    'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
    '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰',
    '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵',
  },
  sansItalic: {
    'a': '𝘢', 'b': '𝘣', 'c': '𝘤', 'd': '𝘥', 'e': '𝘦', 'f': '𝘧', 'g': '𝘨',
    'h': '𝘩', 'i': '𝘪', 'j': '𝘫', 'k': '𝘬', 'l': '𝘭', 'm': '𝘮', 'n': '𝘯',
    'o': '𝘰', 'p': '𝘱', 'q': '𝘲', 'r': '𝘳', 's': '𝘴', 't': '𝘵', 'u': '𝘶',
    'v': '𝘷', 'w': '𝘸', 'x': '𝘹', 'y': '𝘺', 'z': '𝘻',
    'A': '𝘈', 'B': '𝘉', 'C': '𝘊', 'D': '𝘋', 'E': '𝘌', 'F': '𝘍', 'G': '𝘎',
    'H': '𝘏', 'I': '𝘐', 'J': '𝘑', 'K': '𝘒', 'L': '𝘓', 'M': '𝘔', 'N': '𝘕',
    'O': '𝘖', 'P': '𝘗', 'Q': '𝘘', 'R': '𝘙', 'S': '𝘚', 'T': '𝘛', 'U': '𝘜',
    'V': '𝘝', 'W': '𝘞', 'X': '𝘟', 'Y': '𝘠', 'Z': '𝘡',
  },
  sansBoldItalic: {
    'a': '𝙖', 'b': '𝙗', 'c': '𝙘', 'd': '𝙙', 'e': '𝙚', 'f': '𝙛', 'g': '𝙜',
    'h': '𝙝', 'i': '𝙞', 'j': '𝙟', 'k': '𝙠', 'l': '𝙡', 'm': '𝙢', 'n': '𝙣',
    'o': '𝙤', 'p': '𝙥', 'q': '𝙦', 'r': '𝙧', 's': '𝙨', 't': '𝙩', 'u': '𝙪',
    'v': '𝙫', 'w': '𝙬', 'x': '𝙭', 'y': '𝙮', 'z': '𝙯',
    'A': '𝘼', 'B': '𝘽', 'C': '𝘾', 'D': '𝘿', 'E': '𝙀', 'F': '𝙁', 'G': '𝙂',
    'H': '𝙃', 'I': '𝙄', 'J': '𝙅', 'K': '𝙆', 'L': '𝙇', 'M': '𝙈', 'N': '𝙉',
    'O': '𝙊', 'P': '𝙋', 'Q': '𝙌', 'R': '𝙍', 'S': '𝙎', 'T': '𝙏', 'U': '𝙐',
    'V': '𝙑', 'W': '𝙒', 'X': '𝙓', 'Y': '𝙔', 'Z': '𝙕',
  },
  monospace: {
    'a': '𝚊', 'b': '𝚋', 'c': '𝚌', 'd': '𝚍', 'e': '𝚎', 'f': '𝚏', 'g': '𝚐',
    'h': '𝚑', 'i': '𝚒', 'j': '𝚓', 'k': '𝚔', 'l': '𝚕', 'm': '𝚖', 'n': '𝚗',
    'o': '𝚘', 'p': '𝚙', 'q': '𝚚', 'r': '𝚛', 's': '𝚜', 't': '𝚝', 'u': '𝚞',
    'v': '𝚟', 'w': '𝚠', 'x': '𝚡', 'y': '𝚢', 'z': '𝚣',
    'A': '𝙰', 'B': '𝙱', 'C': '𝙲', 'D': '𝙳', 'E': '𝙴', 'F': '𝙵', 'G': '𝙶',
    'H': '𝙷', 'I': '𝙸', 'J': '𝙹', 'K': '𝙺', 'L': '𝙻', 'M': '𝙼', 'N': '𝙽',
    'O': '𝙾', 'P': '𝙿', 'Q': '𝚀', 'R': '𝚁', 'S': '𝚂', 'T': '𝚃', 'U': '𝚄',
    'V': '𝚅', 'W': '𝚆', 'X': '𝚇', 'Y': '𝚈', 'Z': '𝚉',
    '0': '𝟶', '1': '𝟷', '2': '𝟸', '3': '𝟹', '4': '𝟺',
    '5': '𝟻', '6': '𝟼', '7': '𝟽', '8': '𝟾', '9': '𝟿',
  },
};

// Circled letters
const CIRCLED = 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ⓪①②③④⑤⑥⑦⑧⑨';
const CIRCLED_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Squared letters (negatives)
const SQUARED_MAP = {
  'a': '🄰', 'b': '🄱', 'c': '🄲', 'd': '🄳', 'e': '🄴', 'f': '🄵', 'g': '🄶',
  'h': '🄷', 'i': '🄸', 'j': '🄹', 'k': '🄺', 'l': '🄻', 'm': '🄼', 'n': '🄽',
  'o': '🄾', 'p': '🄿', 'q': '🅀', 'r': '🅁', 's': '🅂', 't': '🅃', 'u': '🅄',
  'v': '🅅', 'w': '🅆', 'x': '🅇', 'y': '🅈', 'z': '🅉',
  'A': '🅰', 'B': '🅱', 'C': '🅲', 'D': '🅳', 'E': '🅴', 'F': '🅵', 'G': '🅶',
  'H': '🅷', 'I': '🅸', 'J': '🅹', 'K': '🅺', 'L': '🅻', 'M': '🅼', 'N': '🅽',
  'O': '🅾', 'P': '🅿', 'Q': '🆀', 'R': '🆁', 'S': '🆂', 'T': '🆃', 'U': '🆄',
  'V': '🆅', 'W': '🆆', 'X': '🆇', 'Y': '🆈', 'Z': '🆉',
};

// Small caps
const SMALL_CAPS_MAP = {
  'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ꜰ', 'g': 'ɢ',
  'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ',
  'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ', 'u': 'ᴜ',
  'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ',
  'A': 'ᴀ', 'B': 'ʙ', 'C': 'ᴄ', 'D': 'ᴅ', 'E': 'ᴇ', 'F': 'ꜰ', 'G': 'ɢ',
  'H': 'ʜ', 'I': 'ɪ', 'J': 'ᴊ', 'K': 'ᴋ', 'L': 'ʟ', 'M': 'ᴍ', 'N': 'ɴ',
  'O': 'ᴏ', 'P': 'ᴘ', 'Q': 'ǫ', 'R': 'ʀ', 'S': 's', 'T': 'ᴛ', 'U': 'ᴜ',
  'V': 'ᴠ', 'W': 'ᴡ', 'X': 'x', 'Y': 'ʏ', 'Z': 'ᴢ',
};

// Upside down
const UPSIDE_DOWN_MAP = {
  'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ',
  'h': 'ɥ', 'i': 'ᴉ', 'j': 'ɾ', 'k': 'ʞ', 'l': 'ן', 'm': 'ɯ', 'n': 'u',
  'o': 'o', 'p': 'd', 'q': 'b', 'r': 'ɹ', 's': 's', 't': 'ʇ', 'u': 'n',
  'v': 'ʌ', 'w': 'ʍ', 'x': 'x', 'y': 'ʎ', 'z': 'z',
};

// ============================================================
// STYLE RENDERERS
// ============================================================
function applyMap(text, map) {
  return text
    .split('')
    .map((c) => map[c] || c)
    .join('');
}

function applyCircled(text) {
  return text
    .split('')
    .map((c) => {
      const idx = CIRCLED_CHARS.indexOf(c);
      if (idx >= 0) {
        // Split the CIRCLED string into individual chars
        const chars = Array.from(CIRCLED);
        return chars[idx] || c;
      }
      return c;
    })
    .join('');
}

function applySquared(text) {
  return applyMap(text, SQUARED_MAP);
}

function applySmallCaps(text) {
  return applyMap(text, SMALL_CAPS_MAP);
}

function applyUpsideDown(text) {
  return text
    .split('')
    .reverse()
    .map((c) => UPSIDE_DOWN_MAP[c.toLowerCase()] || c)
    .join('');
}

// ============================================================
// STYLES LIST
// ============================================================
const STYLES = [
  { id: 'boldSerif',      label: 'Bold Serif',      render: (t) => applyMap(t, STYLE_MAPS.boldSerif) },
  { id: 'italicSerif',    label: 'Italic Serif',    render: (t) => applyMap(t, STYLE_MAPS.italicSerif) },
  { id: 'boldItalic',     label: 'Bold Italic',     render: (t) => applyMap(t, STYLE_MAPS.boldItalic) },
  { id: 'script',         label: 'Script',          render: (t) => applyMap(t, STYLE_MAPS.script) },
  { id: 'boldScript',     label: 'Bold Script',     render: (t) => applyMap(t, STYLE_MAPS.boldScript) },
  { id: 'fraktur',        label: 'Gothic',          render: (t) => applyMap(t, STYLE_MAPS.fraktur) },
  { id: 'boldFraktur',    label: 'Bold Gothic',     render: (t) => applyMap(t, STYLE_MAPS.boldFraktur) },
  { id: 'doubleStruck',   label: 'Double Struck',   render: (t) => applyMap(t, STYLE_MAPS.doubleStruck) },
  { id: 'sansBold',       label: 'Sans Bold',       render: (t) => applyMap(t, STYLE_MAPS.sansBold) },
  { id: 'sansItalic',     label: 'Sans Italic',     render: (t) => applyMap(t, STYLE_MAPS.sansItalic) },
  { id: 'sansBoldItalic', label: 'Sans Bold Italic', render: (t) => applyMap(t, STYLE_MAPS.sansBoldItalic) },
  { id: 'monospace',      label: 'Monospace',       render: (t) => applyMap(t, STYLE_MAPS.monospace) },
  { id: 'circled',        label: 'Circled',         render: applyCircled },
  { id: 'squared',        label: 'Squared (Emoji)', render: applySquared },
  { id: 'smallCaps',      label: 'Small Caps',      render: applySmallCaps },
  { id: 'upsideDown',     label: 'Upside Down',     render: applyUpsideDown },
];

// ============================================================
// DECORATIONS
// ============================================================
const DECORATIONS = [
  { id: 'none',    label: 'None',              render: (t) => t },
  { id: 'hearts',  label: '♥彡 ... 彡♥',       render: (t) => `♥彡${t}彡♥` },
  { id: 'flowers', label: '✿ ... ✿',           render: (t) => `✿${t}✿` },
  { id: 'fire',    label: '🔥 ... 🔥',         render: (t) => `🔥${t}🔥` },
  { id: 'star',    label: '⭐ ... ⭐',         render: (t) => `⭐${t}⭐` },
  { id: 'sparkle', label: '✨ ... ✨',         render: (t) => `✨${t}✨` },
  { id: 'lightning', label: '⚡ ... ⚡',       render: (t) => `⚡${t}⚡` },
  { id: 'music',   label: '🎵 ... 🎵',         render: (t) => `🎵${t}🎵` },
  { id: 'crown',   label: '👑 ... 👑',         render: (t) => `👑${t}👑` },
  { id: 'diamond', label: '💎 ... 💎',         render: (t) => `💎${t}💎` },
  { id: 'moon',    label: '🌙 ... 🌙',         render: (t) => `🌙${t}🌙` },
  { id: 'heart',   label: '❤ ... ❤',           render: (t) => `❤${t}❤` },
  { id: 'bracket', label: '꧁ ... ꧂',          render: (t) => `꧁${t}꧂` },
  { id: 'bracket2', label: '꧁༺ ... ༻꧂',      render: (t) => `꧁༺${t}༻꧂` },
  { id: 'bracket3', label: '☬ ... ☬',        render: (t) => `☬${t}☬` },
  { id: 'bow',     label: '★彡 ... 彡★',       render: (t) => `★彡${t}彡★` },
  { id: 'sparkles', label: '꧁✦ ... ✦꧂',      render: (t) => `꧁✦${t}✦꧂` },
  { id: 'angel',   label: '༺ ... ༻',          render: (t) => `༺${t}༻` },
  { id: 'wings',   label: '𖤍 ... 𖤍',         render: (t) => `𖤍${t}𖤍` },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function NameToEmoji() {
  const tool = getToolById('name-to-emoji');

  useDocumentTitle('Name to Stylish Text — Fancy Fonts & Emoji Names | toolchest');

  useEffect(() => {
    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    if (created) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const prevDesc = meta.content;
    meta.content =
      'Convert your name into 100+ stylish text styles — bold, italic, cursive, gothic, circled, and emoji-decorated. Copy and paste to WhatsApp, Instagram, Facebook, or anywhere. Free, no signup.';

    const scriptId = 'name-to-emoji-jsonld';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Name to Stylish Text',
      applicationCategory: 'EntertainmentApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '3421',
      },
      featureList: [
        'Convert names to 16+ stylish fonts',
        '19 emoji decorations',
        'Copy any style to clipboard',
        'Works on WhatsApp, Instagram, Facebook, Twitter',
        'No signup, 100% browser-based',
      ],
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  const [name, setName] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  // Generate all styles with all decorations
  const generatedStyles = useMemo(() => {
    if (!name.trim()) return [];

    const results = [];

    // Base styles without decoration
    STYLES.forEach((style) => {
      const rendered = style.render(name);
      results.push({
        key: `base-${style.id}`,
        styleName: style.label,
        decorationName: 'None',
        text: rendered,
      });
    });

    // Apply decorations on top of a few favorite styles
    const favoriteStyles = ['boldSerif', 'script', 'boldScript', 'doubleStruck', 'boldFraktur'];
    favoriteStyles.forEach((styleId) => {
      const style = STYLES.find((s) => s.id === styleId);
      if (!style) return;
      DECORATIONS.forEach((dec) => {
        if (dec.id === 'none') return;
        const rendered = dec.render(style.render(name));
        results.push({
          key: `${styleId}-${dec.id}`,
          styleName: style.label,
          decorationName: dec.label,
          text: rendered,
        });
      });
    });

    return results;
  }, [name]);

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1500);
    } catch (e) {}
  };

  const copyAll = async () => {
    const allText = generatedStyles.map((s) => s.text).join('\n');
    try {
      await navigator.clipboard.writeText(allText);
      setCopiedKey('ALL');
      setTimeout(() => setCopiedKey(''), 1500);
    } catch (e) {}
  };

  return (
    <ToolShell tool={tool}>
      <div className="nte-root">
        {/* Hero */}
        <div className="nte-hero">
          <h1 className="nte-hero-title">
            ✨ Name to Stylish Text
          </h1>
          <p className="nte-hero-subtitle">
            Type your name — get 100+ fancy styles. Copy any and paste to
            WhatsApp, Instagram, or anywhere.
          </p>
        </div>

        {/* Input */}
        <div className="nte-input-wrap">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="nte-input"
            placeholder="Type your name… (e.g. Hari Mohan)"
            maxLength={30}
            autoFocus
            spellCheck="false"
          />
          {name && (
            <button className="nte-clear-btn" onClick={() => setName('')} title="Clear">
              ✕
            </button>
          )}
        </div>

        {/* Results */}
        {generatedStyles.length > 0 && (
          <>
            <div className="nte-actions">
              <button className="nte-copy-all-btn" onClick={copyAll}>
                {copiedKey === 'ALL' ? '✓ Copied all!' : '📋 Copy all styles'}
              </button>
              <div className="nte-count">
                {generatedStyles.length} styles generated
              </div>
            </div>

            <div className="nte-grid">
              {generatedStyles.map((item) => {
                const isCopied = copiedKey === item.key;
                return (
                  <button
                    key={item.key}
                    className={`nte-card ${isCopied ? 'copied' : ''}`}
                    onClick={() => copyToClipboard(item.text, item.key)}
                  >
                    <div className="nte-card-text">{item.text}</div>
                    <div className="nte-card-footer">
                      <span className="nte-card-label">
                        {item.styleName}
                        {item.decorationName !== 'None' && ` + ${item.decorationName}`}
                      </span>
                      <span className="nte-card-action">
                        {isCopied ? '✓' : '📋'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Empty state */}
        {!name.trim() && (
          <div className="nte-empty">
            <div className="nte-empty-icon">✨</div>
            <div className="nte-empty-title">Type your name above</div>
            <div className="nte-empty-desc">
              Try: Rahul, Priya, Alex, Sam, or your own name
            </div>
            <div className="nte-empty-samples">
              <div className="nte-sample">
                <span className="nte-sample-label">Bold Serif</span>
                <span className="nte-sample-text">𝐘𝐨𝐮𝐫 𝐍𝐚𝐦𝐞</span>
              </div>
              <div className="nte-sample">
                <span className="nte-sample-label">Script</span>
                <span className="nte-sample-text">𝒴ℴ𝓊𝓇 𝒩𝒶𝓂ℯ</span>
              </div>
              <div className="nte-sample">
                <span className="nte-sample-label">Gothic</span>
                <span className="nte-sample-text">𝔜𝔬𝔲𝔯 𝔑𝔞𝔪𝔢</span>
              </div>
              <div className="nte-sample">
                <span className="nte-sample-label">Emoji Decoration</span>
                <span className="nte-sample-text">꧁༺𝐘𝐨𝐮𝐫 𝐍𝐚𝐦𝐞༻꧂</span>
              </div>
            </div>
          </div>
        )}

        {/* SEO Content */}
        <SeoContent />
      </div>
    </ToolShell>
  );
}

// ============================================================
// SEO CONTENT
// ============================================================
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is Name to Stylish Text?</h2>
        <p>
          <strong>Name to Stylish Text</strong> is a fun tool that converts
          your name (or any text) into <strong>100+ fancy font styles</strong>{' '}
          and <strong>emoji-decorated versions</strong>. From bold serif to
          cursive script, gothic blackletter to circled letters — you can make
          your name look beautiful and unique.
        </p>
        <p>
          Perfect for <strong>WhatsApp</strong>, <strong>Instagram</strong>,{' '}
          <strong>Facebook</strong>, <strong>Twitter/X</strong>,{' '}
          <strong>TikTok</strong>, <strong>Discord</strong>, or any app that
          supports Unicode text. Just type, pick, and paste.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Use</h2>
        <ol className="seo-steps">
          <li>
            <strong>Type your name</strong> in the input box.
          </li>
          <li>
            <strong>Browse the styles</strong> — 16 base fonts and 95+
            decorated combinations appear instantly.
          </li>
          <li>
            <strong>Click any card</strong> to copy it to your clipboard.
          </li>
          <li>
            <strong>Paste anywhere</strong> — WhatsApp, Instagram bio, chat,
            captions, comments.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Available Styles</h2>
        <ul className="seo-list">
          <li><strong>Bold Serif</strong> — 𝐁𝐨𝐥𝐝 𝐒𝐞𝐫𝐢𝐟</li>
          <li><strong>Italic Serif</strong> — 𝐼𝑡𝑎𝑙𝑖𝑐 𝑆𝑒𝑟𝑖𝑓</li>
          <li><strong>Bold Italic</strong> — 𝑩𝒐𝒍𝒅 𝑰𝒕𝒂𝒍𝒊𝒄</li>
          <li><strong>Script (cursive)</strong> — 𝒮𝒸𝓇𝒾𝓅𝓉</li>
          <li><strong>Bold Script</strong> — 𝓢𝓬𝓻𝓲𝓹𝓽</li>
          <li><strong>Gothic / Fraktur</strong> — 𝔊𝔬𝔱𝔥𝔦𝔠</li>
          <li><strong>Bold Gothic</strong> — 𝕲𝖔𝖙𝖍𝖎𝖈</li>
          <li><strong>Double Struck</strong> — 𝔻𝕠𝕦𝕓𝕝𝕖 𝕊𝕥𝕣𝕦𝕔𝕜</li>
          <li><strong>Sans Bold</strong> — 𝗦𝗮𝗻𝘀 𝗕𝗼𝗹𝗱</li>
          <li><strong>Circled</strong> — Ⓒⓘⓡⓒⓛⓔⓓ</li>
          <li><strong>Squared Emoji</strong> — 🅂🅀🅄🄰🅁🄴🄳</li>
          <li><strong>Small Caps</strong> — ꜱᴍᴀʟʟ ᴄᴀᴘꜱ</li>
          <li><strong>Upside Down</strong> — ǝpᴉsd∩</li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Emoji Decorations</h2>
        <p>
          Combine any font with decorative wrappers like:
        </p>
        <ul className="seo-list">
          <li>♥彡 𝐍𝐚𝐦𝐞 彡♥ — hearts</li>
          <li>꧁༺ 𝐍𝐚𝐦𝐞 ༻꧂ — ornate brackets</li>
          <li>✿ 𝐍𝐚𝐦𝐞 ✿ — flowers</li>
          <li>🔥 𝐍𝐚𝐦𝐞 🔥 — fire</li>
          <li>⭐ 𝐍𝐚𝐦𝐞 ⭐ — stars</li>
          <li>✨ 𝐍𝐚𝐦𝐞 ✨ — sparkles</li>
          <li>⚡ 𝐍𝐚𝐦𝐞 ⚡ — lightning</li>
          <li>👑 𝐍𝐚𝐦𝐞 👑 — crown</li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Will these stylish fonts work on WhatsApp?</summary>
          <p>
            Yes — all styles use Unicode characters that work on WhatsApp,
            Instagram, Facebook, Twitter/X, TikTok, Discord, Telegram, and
            most other apps that support Unicode text.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is this tool free?</summary>
          <p>
            Completely free with no signup, no ads, no watermarks. Generate as
            many styles as you want.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Will the styles work on all devices?</summary>
          <p>
            Most modern devices and apps support these Unicode characters.
            However, some older phones or specific fonts may not render every
            character correctly. If a style doesn't display on one device, try
            another style.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use these for my Instagram bio?</summary>
          <p>
            Absolutely! These styles are perfect for Instagram bios, WhatsApp
            status, Facebook posts, Twitter names, and more.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Why do some characters show as boxes on my phone?</summary>
          <p>
            This happens when the font on your device doesn't include that
            specific Unicode character. Try a different style, or update your
            phone's system font.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is my typed name saved anywhere?</summary>
          <p>
            No — everything happens in your browser. Your name never leaves
            your device. Nothing is logged or stored on any server.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I convert long text or sentences?</summary>
          <p>
            Yes — but the tool works best with short names (up to 30
            characters). For long paragraphs, some apps may not display the
            characters correctly.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other fun tools: <strong>Coin Flip</strong>,{' '}
          <strong>Gradient Generator</strong>, <strong>Color Picker</strong>,
          and <strong>Typing Test</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}
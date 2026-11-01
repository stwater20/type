// Word Blade 單字庫：w = 英文，m = 中文字義
(function () {
  const parse = (s) =>
    s.trim().split(/\s*,\s*/).map((pair) => {
      const [w, m] = pair.split(':');
      return { w: w.trim().toLowerCase(), m: (m || '').trim() };
    });

  // 第一階：3–4 個字母
  const tier1 = parse(`
    cat:貓, dog:狗, sun:太陽, sky:天空, map:地圖, key:鑰匙, run:跑, fly:飛, red:紅色, box:盒子,
    cup:杯子, egg:蛋, ice:冰, owl:貓頭鷹, fox:狐狸, bee:蜜蜂, ant:螞蟻, pig:豬, cow:牛, hat:帽子,
    bag:包包, pen:筆, art:藝術, joy:喜悅, win:獲勝, hero:英雄, fire:火, wind:風, rain:雨, snow:雪,
    moon:月亮, star:星星, tree:樹, leaf:葉子, rock:岩石, gold:黃金, ring:戒指, king:國王, gate:大門, door:門,
    road:道路, ship:船, fish:魚, bird:鳥, wolf:狼, bear:熊, frog:青蛙, lion:獅子, duck:鴨子, milk:牛奶,
    cake:蛋糕, rice:米飯, soup:湯, book:書, desk:書桌, lamp:燈, time:時間, game:遊戲, jump:跳, kick:踢,
    swim:游泳, sing:唱歌, cold:冷, warm:溫暖, fast:快, slow:慢, dark:黑暗, glow:發光, hope:希望, mind:心智,
    soul:靈魂, gem:寶石, axe:斧頭, bow:弓, orb:寶珠, zap:電擊, hex:詛咒, wave:波浪, sand:沙子, cave:洞穴,
    hill:山丘, lake:湖, iron:鐵, quiz:測驗, yarn:毛線, zoo:動物園, vow:誓言, jar:罐子, web:網, oak:橡樹,
    elf:精靈, yes:是, nut:堅果, mud:泥巴, fog:霧, ink:墨水, unit:單位, vase:花瓶, yell:大喊, zero:零
  `);

  // 第二階：5–6 個字母
  const tier2 = parse(`
    sword:劍, magic:魔法, brave:勇敢, dragon:龍, castle:城堡, forest:森林, shield:盾牌, potion:藥水, knight:騎士, flame:火焰,
    storm:風暴, river:河流, ocean:海洋, cloud:雲, light:光, night:夜晚, dream:夢想, power:力量, quest:任務, armor:盔甲,
    tower:塔, crown:王冠, ghost:幽靈, spirit:精神, island:島嶼, bridge:橋, garden:花園, winter:冬天, summer:夏天, spring:春天,
    autumn:秋天, silver:銀, purple:紫色, orange:橘色, yellow:黃色, planet:行星, rocket:火箭, school:學校, friend:朋友, family:家人,
    people:人們, happy:快樂, smile:微笑, laugh:大笑, heart:心, voice:聲音, music:音樂, dance:跳舞, paint:畫畫, write:寫,
    learn:學習, teach:教, study:讀書, think:思考, world:世界, earth:地球, water:水, money:錢, price:價格, market:市場,
    travel:旅行, ticket:票, window:窗戶, mirror:鏡子, pencil:鉛筆, paper:紙, letter:信, number:數字, answer:答案, puzzle:謎題,
    secret:秘密, monkey:猴子, tiger:老虎, rabbit:兔子, turtle:烏龜, spider:蜘蛛, cookie:餅乾, banana:香蕉, cheese:起司, coffee:咖啡,
    butter:奶油, jungle:叢林, desert:沙漠, valley:山谷, frozen:冰凍的, shadow:影子, battle:戰鬥, enemy:敵人, legend:傳說, wizard:巫師,
    archer:弓箭手, hunter:獵人, beast:野獸, venom:毒液, blaze:烈焰, frost:冰霜, galaxy:銀河, zombie:殭屍, quiet:安靜的, yogurt:優格
  `);

  // 第三階：7 個字母以上
  const tier3 = parse(`
    victory:勝利, thunder:雷, crystal:水晶, kingdom:王國, journey:旅程, courage:勇氣, warrior:戰士, monster:怪物, treasure:寶藏, adventure:冒險,
    mountain:山, volcano:火山, keyboard:鍵盤, computer:電腦, practice:練習, language:語言, beautiful:美麗的, important:重要的, different:不同的, question:問題,
    morning:早上, evening:傍晚, weather:天氣, rainbow:彩虹, sunshine:陽光, starlight:星光, midnight:午夜, mystery:謎團, library:圖書館, hospital:醫院,
    restaurant:餐廳, chocolate:巧克力, elephant:大象, dinosaur:恐龍, penguin:企鵝, butterfly:蝴蝶, dolphin:海豚, scorpion:蠍子, phantom:幻影, guardian:守護者,
    champion:冠軍, legendary:傳奇的, darkness:黑暗, lightning:閃電, blizzard:暴風雪, earthquake:地震, explorer:探險家, discover:發現, remember:記得, together:一起,
    tomorrow:明天, yesterday:昨天, everything:一切, excellent:優秀的, wonderful:美好的, dangerous:危險的, invisible:隱形的, powerful:強大的, ancient:古老的, enchanted:被施魔法的,
    necklace:項鍊, lantern:燈籠, compass:指南針, universe:宇宙, imagine:想像, believe:相信, freedom:自由, history:歷史, science:科學, festival:節日,
    birthday:生日, umbrella:雨傘, sandwich:三明治, strawberry:草莓, pineapple:鳳梨, vegetable:蔬菜, quickly:快速地, journal:日記, kangaroo:袋鼠, zeppelin:飛艇
  `);

  // 魔王台詞：要完整打出整句（含空白）
  const phrases = [
    parse(`
      never give up:永不放棄, practice makes perfect:熟能生巧, time is money:時間就是金錢, you can do it:你做得到,
      every day counts:每一天都重要, dream big:勇敢做大夢, slow and steady:穩扎穩打, keep going:繼續前進,
      be brave:要勇敢, light the way:照亮前路, just do it:做就對了, no pain no gain:一分耕耘一分收穫
    `),
    parse(`
      knowledge is power:知識就是力量, the early bird catches the worm:早起的鳥兒有蟲吃,
      actions speak louder than words:行動勝於言語, where there is a will there is a way:有志者事竟成,
      fortune favors the bold:天佑勇者, a journey of a thousand miles:千里之行，始於足下,
      the pen is mightier than the sword:筆比劍更有力, better late than never:遲做總比不做好,
      honesty is the best policy:誠實為上策, all roads lead to rome:條條大路通羅馬
    `),
    parse(`
      the quick brown fox jumps over the lazy dog:敏捷的棕狐跳過了懶狗,
      light always defeats the darkness:光明終將戰勝黑暗, every great hero was once a beginner:每個偉大的英雄都曾是新手,
      your fingers are faster than my shadows:你的手指比我的影子還快, the keyboard is mightier than the sword:鍵盤比劍更強大,
      courage is not the absence of fear:勇氣不是沒有恐懼, the best way out is always through:最好的出路就是穿越它
    `),
  ];

  window.WORDS = { tiers: [tier1, tier2, tier3], phrases };
})();

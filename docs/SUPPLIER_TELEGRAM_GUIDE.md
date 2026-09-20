# YeBetWeg Supplier Guide — Submit Prices on Telegram
# የአቅራቢ መመሪያ — በቴሌግራም ዋጋ ያቅርቡ

Share prices from your shop or site in **under 30 seconds** — no app, no login. Your price goes straight into YeBetWeg's market feed for buyers across Ethiopia.

ከሱቅዎ ወይም ከጣቢያዎ ዋጋዎችን በ30 ሰከንድ ያጋሩ — መተግበሪያ አያስፈልግም። ዋጋዎ በቀጥታ ወደ YeBetWeg የገበያ መረጃ ይገባል።

---

## 1. Start / ጀምር

Open the YeBetWeg bot on Telegram and send:

```
/start
```

You'll get the help card with the command reference.

ቦቱን ይክፈቱ እና `/start` ይላኩ — የእገዛ ካርድ ይደርስዎታል።

## 2. Submit a price / ዋጋ ያቅርቡ

Send one line in this order:

**/submitprice  material  price  [unit]  [city]  [category]**

Everything before the first number is the material name; after the price come the unit, the city, and the category — in that order. Quote names that contain spaces.

```
/submitprice Derba Cement 8200
```

```
/submitprice Derba Cement 8200 Qtl "Addis Ababa" cement
```

```
/submitprice "Rebar 12mm" 14300 Qtl Hawassa steel
```

**Tips:** `1,150`-style numbers work; omit the unit and it defaults to `Qtl`; omit the city and it defaults to Addis Ababa; categories are `cement`, `steel`, `finishing`, `electrical`, `plumbing`.

**ምክሮች** — ዋጋውን የሚከተለው ነገር መጀመሪያ የቁሳቁሱ ስም ነው፤ ከዚያ በቅደም ተከተል ልኬት፣ ከተማ እና ምድብ ይግባሉ። ልኬት ካላስገቡ `Qtl`፣ ከተማ ካላስገቡ አዲስ አበባ ይወሰዳል።

### What happens next / ቀጥሎ ምን ይኖራል

1. The bot replies **"New price recorded"** with what it parsed — check the material and city are right.
2. Your price enters a **review queue** marked `community_reported`. Admins see it instantly and verify it, usually within a day.
3. Once verified, buyers see it on the **Market Prices** board with your shop name as the source.
4. Submit the **same material in the same city again** and the bot updates your existing price instead of duplicating it.

1. ቦቱ **"New price recorded"** ብሎ የተገለጠውን ይመልስልዎታል — የቁሳቁሱና የከተማው ስም ትክክል መሆኑን ያረጋግጡ።
2. ዋጋዎ ለአስተዳዳሪዎች ማረጋገጫ ይጠበቃል — በአንድ ቀን ውስጥ ይረጋገጣል።
3. ከተረጋገጠ በኋላ በገበያ ዋጋ ገጹ ላይ በሱቅዎ ስም ይታያል።
4. **ተመሳሳይ ቁሳቁስን በተመሳሳይ ከተማ** እንደገና ከላኩ ቦቱ ያለብዛት ያዘምነዋል።

## 3. Track the market / ገበያውን ይከታተሉ

```
/watch
```

Get the current top cement & rebar movers across cities — the same weekly watch buyers see.

በሳምንት ውስጥ ከፍተኛ የሲሚንቶና ብረት ዋጋ ለውጦችን ይመልከቱ።

## 4. Fair-play rules / የመስሪያ ህጎች

These keep the market feed trustworthy for everyone — and keep your submissions accepted:

እነዚህ ህጎች የገበያ መረጃውን ታማኝ ያደርጋሉ — እና ማቅረብዎን ይቀጥላሉ፡

| Rule / ህግ | Detail / ዝርዝር |
|---|---|
| **Real prices only** | Quote what a buyer would actually pay today. No aspirational or bait prices. ዛሬ በእውነት የሚከፈል ዋጋ ብቻ ይላኩ። |
| **Your own price** | Submit prices from your shop/site or a direct observation — not rumors. ከሱቅዎ ወይም ከቀጥታ ግኝት — ወሬ አይደለም። |
| **No spam** | Up to 10 submissions per hour per person; resubmitting the same material+city updates your earlier price instead of duplicating it. በሰዓት 10 ማቅረቢያ ብቻ፤ ተመሳሳይ ቁሳቁስ+ከተማ ያለብዛት ይዘምናል። |
| **Accurate names** | Use recognizable material names ("Derba Cement", "Grade 60 Rebar 12mm"). Odd names slow verification. የተለመዱ ስሞችን ይጠቀሙ። |
| **Admin moderation** | Admins verify or reject every submission. Repeated false pricing removes your submissions and can bar the account. አስተዳዳሪዎች እያንዳንዱን ይመረምራሉ፤ ብዙ የሐሰት ዋጋ መላክ እገዳ ያመጣል። |

### What "pending verification" means / "ማረጋገጥ የሚጠባበቅ" ምን ማለት ነው

Your price is **visible to admins only** until verified. Nothing is published to buyers from an unverified row, so honest suppliers are never undercut by bad data. If your price is rejected, it stays hidden — simply resubmit if it was a typo.

ዋጋዎ እስኪረጋገጥ **ለአስተዳዳሪዎች ብቻ** ይታያል። ያልተረጋገጠ ዋጋ ለገዢዎች አይታይም። ስህተት ከሆነ እንደገና ይላኩ።

## 5. FAQ

**Q: My price replaced an old one — did I do something wrong?**
No. Same material + same city = an update. That's the correct flow.

**ሠ? ዋጋዬ ያረገውን ተክቷል — ስህተት አደረግኩን?**
አይደለም። ተመሳሳይ ቁሳቁስ + ተመሳሳይ ከተማ = ዝማኔ።

**Q: Can I submit for another city?**
Yes — put the city after the unit: `/submitprice Cement 8000 Qtl Adama cement`.

**ሠ? ለሌላ ከተማ ማቅረብ እችላለሁ?**
አዎ — ከተማውን ከልኬቱ በኋላ ያስገቡ፦ `/submitprice Cement 8000 Qtl Adama cement`።

**Q: Who sees my shop name?**
Buyers see it as the price source once verified — that's the visibility benefit of contributing.

**ሠ? የሱቅ ስሜ ማን ያያል?**
ከተረጋገጠ በኋላ ገዢዎች እንደ ምንጭ ያያሉ — ይህ የመሳተፍ ጥቅሙ ነው።

**Q: Units?**
Include the unit you sell in (`Qtl`, `m3`, `pc`, `bag`) right after the price; if you omit it, the bot records `Qtl`. Submit in the unit your buyers actually use.

**ሠ? ልኬቶች?**
ልኬትዎን ከዋጋው በኋላ ያስገቡ (`Qtl`፣ `m3`፣ `pc`፣ `bag`)፤ ካላስገቡ `Qtl` ይመዘገባል።

---

*Suppliers power YeBetWeg's live market data — thank you for keeping prices honest.* አቅራቢዎች የቀጥታ የገበያ መረጃችን ኃይል ናችሁ — ለታማኝ ዋጋ እናመሰግናለን።

# The Packed Rabbit starter move file

An open format any assistant, agent or robot can write, so a person doesn't have to type their move twice. It's a plain JSON file. The person opens it in the app (Menu, Two phones, one move, Choose a file). The app shows what's in it and asks before adding anything. It only adds; it never changes or deletes what's already there.

## The format
```json
{
  "packedrabbit": "move-1",
  "from": "Name of the assistant that made it",
  "boxes": [
    { "room": "KIT", "contents": "plates, mugs, the good bowls", "size": "Small", "fragile": true },
    { "room": "BED1", "destRoom": "BED2", "contents": "winter coats", "size": "Large" },
    { "room": "OPEN", "contents": "kettle, coffee, phone chargers", "size": "Medium", "essential": true }
  ],
  "furniture": [
    { "name": "Sofa", "room": "LIV", "w": 84, "d": 36, "h": 34 },
    { "name": "Queen bed frame", "room": "BED1" }
  ]
}
```

## Fields
- **packedrabbit**: always "move-1". Files without it are ignored.
- **from**: who made the file. Shown to the person before they add it.
- **boxes**: up to 500.
  - **room** (required): a room code. Unknown codes become MISC.
  - **destRoom**: the room at the new place, if it's different.
  - **contents**: what's inside, separated by commas. Each becomes an item the person can search for.
  - **size**: Small, Medium, Large, Extra large, Dish pack, Wardrobe, Bin, Suitcase, Bag or Wrapped item. Anything else becomes Medium.
  - **fragile**, **essential**: true or false.
  - **notes**: free text.
- **furniture**: up to 200.
  - **name** (required).
  - **room**: a room code.
  - **w**, **d**, **h**: width, depth and height in inches. The app checks these against every doorway.
  - **category**, **notes**: free text.

The app gives each box its next number in that room (KIT-07, KIT-08), so the person writes that number on the box.

## Room codes
KIT kitchen, LIV living room, DIN dining room, FAM family room, BED1 primary bedroom, BED2 second bedroom, BATH1 primary bathroom, BATH2 second bathroom, CLO closets, HALL hall closet, OFF office, GAR garage, LAU laundry, ENT entryway, PAT patio, BASE basement, ATT attic, SHED shed, POOL pool and yard, KIDS kids' room, SPORT sports and outdoor, MED medical and mobility, PET pets, DOC documents, OPEN open first, HAND hand carry, MISC miscellaneous.

## Please don't put in it
Account numbers, passwords, medical details or anything the person didn't ask you to include. The file is theirs; keep it to what they're packing.

License: this format is free for anyone to use. Back to the guide for assistants: https://packedrabbit.com/for-assistants/

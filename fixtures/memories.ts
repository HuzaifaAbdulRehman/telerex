export interface MemoryFact { id: string; statement: string }
export interface Memory { id: string; title: string; note: string; story: string; phrases: string[]; facts: MemoryFact[] }
export const memories: Memory[] = [
  {
    id:'blue-tin', title:'The blue biscuit tin', note:'A keepsake, an uncertain goodbye.',
    story:'In 1998, my grandmother Mariam kept a blue tin on the highest shelf of her kitchen. It held spare buttons, not biscuits. The lid had a dent shaped like a crescent. Every Thursday, she let me choose one button and tell her where it might have come from. She never said the buttons were valuable. When she moved in 2006, my uncle Haris wanted to throw the tin away. Mariam gave it to my younger sister instead. I remember my sister carrying it with both hands, although I cannot remember whether that was the morning we left or the evening before. The tin stayed blue; nobody painted it. Years later, the thing I could still picture was the dent in the lid, not any of the stories I had invented about the buttons.',
    phrases:['Mariam','1998','buttons','younger sister','dent'],
    facts:[
      {id:'tin-year',statement:'The initial kitchen memory is from 1998.'},
      {id:'tin-contents',statement:'The tin held buttons, not biscuits.'},
      {id:'tin-dent',statement:'The lid had a crescent-shaped dent.'},
      {id:'tin-recipient',statement:'Mariam gave the tin to the younger sister, not the narrator.'},
      {id:'tin-uncertainty',statement:'The narrator cannot remember whether the departure memory was morning or the previous evening.'}
    ]
  },
  {
    id:'cancelled-train', title:'The train we never took', note:'A journey remembered for not happening.',
    story:'On 12 August 2004, my cousin Bilal and I waited on platform three at Mirpur station. Our train was cancelled, not merely delayed. We did not board another train. My aunt Saira collected us in a green minibus, and we went home without visiting Lahore. Bilal was eleven and I was nine. He kept the unused tickets in a school exercise book, between a drawing of a kite and a page of multiplication tables. That afternoon we ate lentils at home while the rain continued. I remember being disappointed, but Bilal said the station was the best part of the trip. The tickets were still there when he showed me the book the following winter. I do not know where the exercise book is now.',
    phrases:['12 August 2004','Bilal','cancelled','green minibus','Lahore'],
    facts:[
      {id:'train-date',statement:'The station visit was on 12 August 2004.'},
      {id:'train-status',statement:'The train was cancelled, not delayed.'},
      {id:'train-no-boarding',statement:'They did not board another train or visit Lahore.'},
      {id:'train-ride',statement:'Aunt Saira took them home in a green minibus.'},
      {id:'train-book',statement:'Bilal kept the unused tickets in a school exercise book.'}
    ]
  },
  {
    id:'recipe-envelope', title:'A recipe on an envelope', note:'Some instructions survived; others did not.',
    story:'My grandmother Safiya wrote her fennel-biscuit recipe on the back of an electricity envelope. It called for three teaspoons of fennel, not three tablespoons. She used oil rather than butter. The oven temperature was missing because that corner of the envelope had torn off. I think she wrote it in 1987, but the envelope does not have a readable date. My father later added a note saying to let the dough rest for twenty minutes. That instruction was his, not Safiya\'s. The first batch I made was too dark at the edges. My grandmother laughed and ate the smallest biscuit. I still have the words about the fennel, but I cannot recover the missing temperature from the paper. When I copy the recipe, I leave that space blank.',
    phrases:['Safiya','three teaspoons','oil','1987','twenty minutes'],
    facts:[
      {id:'recipe-amount',statement:'The recipe specified three teaspoons of fennel, not tablespoons.'},
      {id:'recipe-fat',statement:'Safiya used oil rather than butter.'},
      {id:'recipe-temperature',statement:'The oven temperature is missing and remains unknown.'},
      {id:'recipe-date',statement:'1987 is a tentative recollection, not a confirmed date.'},
      {id:'recipe-rest',statement:'The father added the twenty-minute rest instruction; it was not Safiya\'s original instruction.'}
    ]
  },
  {
    id:'two-brothers', title:'Who held the camera', note:'A photograph does not identify its photographer.',
    story:'My older brother Adil appears in the photograph beside a yellow bicycle. My younger brother Sami took the photograph. Our uncle Nadeem lent Sami the camera, but he was not there when the picture was taken. It was June 2010, outside our old house in Multan. Adil borrowed the bicycle from a neighbour for that afternoon; it was never his birthday present. I stood behind Sami and held the camera case. Nobody in the photograph is holding the camera because Sami is on the other side of it. The print has a white stripe across one corner. My mother wrote both brothers\' names on the back, without explaining their different roles. When I found it years later, Sami reminded me who had pressed the shutter.',
    phrases:['Adil','Sami','Nadeem','June 2010','borrowed'],
    facts:[
      {id:'camera-subject',statement:'Adil is the older brother and appears in the photograph.'},
      {id:'camera-photographer',statement:'Sami is the younger brother and took the photograph.'},
      {id:'camera-owner',statement:'Uncle Nadeem lent the camera but was absent when the photograph was taken.'},
      {id:'camera-date',statement:'The photograph was taken in June 2010 outside the old house in Multan.'},
      {id:'camera-bicycle',statement:'The yellow bicycle was borrowed, not a birthday present.'}
    ]
  },
  {
    id:'lantern-year', title:'The year of the lantern', note:'An honest gap in the family record.',
    story:'My aunt Rukhsana remembers a power cut during an Eid dinner, but she cannot decide whether it happened in 1986 or 1987. There is no date on the photograph. My grandfather lit a small brass lantern and put it on the kitchen floor, away from the curtains. Nobody was injured, and the house did not catch fire. Rukhsana remembers her sister carrying rice from the kitchen while the rest of the family waited in the courtyard. She thinks a neighbour brought matches, although she is less sure about that detail than the lantern itself. I wrote down both possible years. When my cousin asked me to choose one for the album, I left the date as unknown. The photograph shows the lantern, but it cannot settle our argument about the year.',
    phrases:['Rukhsana','1986','1987','brass lantern','unknown'],
    facts:[
      {id:'lantern-date',statement:'The year is uncertain between 1986 and 1987; neither is confirmed.'},
      {id:'lantern-place',statement:'The brass lantern was placed on the kitchen floor away from curtains.'},
      {id:'lantern-safety',statement:'Nobody was injured and there was no house fire.'},
      {id:'lantern-matches',statement:'A neighbour bringing matches is an uncertain recollection.'},
      {id:'lantern-album',statement:'The narrator left the album date unknown rather than choosing a year.'}
    ]
  },
  {
    id:'quiet-saturday', title:'A quiet Saturday', note:'An ordinary control case.',
    story:'Every Saturday, Noor walked to the library with her father. They left home at nine in the morning and returned before lunch. Noor borrowed two books each time: one about animals and one storybook. Her father borrowed a newspaper from the reading desk but did not take it home. On the way back they bought four bread rolls from the bakery next to the bus stop. They paid with cash. The librarian knew their names and kept a small wooden stool beside the children\'s shelf so Noor could reach the upper row. This routine continued for one summer. There was no special celebration on the last Saturday; they returned the books and took their usual walk home.',
    phrases:['Noor','nine','two books','four bread rolls','cash'],
    facts:[
      {id:'saturday-company',statement:'Noor went to the library with her father on Saturdays.'},
      {id:'saturday-time',statement:'They left at nine in the morning and returned before lunch.'},
      {id:'saturday-books',statement:'Noor borrowed two books: an animal book and a storybook.'},
      {id:'saturday-newspaper',statement:'The father did not take the newspaper home.'},
      {id:'saturday-bread',statement:'They bought four bread rolls and paid cash.'}
    ]
  }
];
export const samples = memories.slice(0,3);

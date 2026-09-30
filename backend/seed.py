"""Fill a database with a small collection, for development: The Big Bang
Theory in full, and smaller lores around it - DC Comics, Songs I Love,
Corinthians, Games and HQ's - so the sky has something to show: lores that
share entities, and one entity that lives in three of them at once.

The schema comes from Alembic; this only adds content. Run it against a database
that has already been migrated:

    alembic upgrade head
    python seed.py

It refuses to run on a database that already holds entities. Pass --reset to
empty the four content tables first.

Never point this at the real database.
"""
import sys

from app.database import SessionLocal
from datetime import date

from app.models import User, EntityType, Entity, Relationship, Lore, EntityLore, EntityDate

db = SessionLocal()

if "--reset" in sys.argv:
    # order matters: children before parents, or the foreign keys refuse. The
    # account lets go of its you-node, its date of birth and its Nebula first -
    # all RESTRICT, so while it points at them nothing underneath can be deleted
    db.query(User).update({User.self_entity_id: None, User.birth_date_id: None, User.nebula_lore_id: None})
    db.query(EntityDate).delete()
    db.query(EntityLore).delete()
    db.query(Relationship).delete()
    db.query(Lore).delete()
    db.query(Entity).delete()
    db.query(User).delete()
    db.query(EntityType).delete()
    db.commit()

if db.query(Entity).count() > 0:
    raise SystemExit("this database already holds entities; pass --reset to replace them")

# ------------------------------------------------------------------ types
TYPES = ["Character", "Place", "Object", "Concept", "Organization", "Person", "Music", "Game", "Event", "Comic"]
types = {}
for name in TYPES:
    t = EntityType(name=name)
    db.add(t)
    types[name] = t
db.flush()

# ------------------------------------------------------------------- user
# the user is born first, pointing at nothing: the entity does not exist yet.
# It has no name of its own - the name is the you-node's, created below.
dev = User(email="dev@lorepsum.local")
db.add(dev)
db.flush()

# --------------------------------------------------------------- entities
ENTITIES = [
    ("dev", "Person", "Where it all starts. Every entity here exists because you put it here, and every line between them is a claim you made. This card is the only one in the collection whose subject is also its reader."),

    ("Sheldon Cooper", "Character", "A theoretical physicist who treats social convention as an optional protocol and certainty as a resting state. He is not unkind so much as unequipped; the rules other people absorb by osmosis, he has to be handed in writing. Everything he loves, he loves at full volume and in numbered order."),
    ("Leonard Hofstadter", "Character", "An experimental physicist, and the one who keeps the apartment habitable in every sense of the word. He is the group's centre of gravity precisely because he wants least to be, and the only one who could plausibly leave and does not."),
    ("Penny", "Character", "An aspiring actress from Nebraska who moved in across the hall and became the group's translator to the outside world. She arrived knowing nothing about any of it and ended up the person who explains them to each other."),
    ("Howard Wolowitz", "Character", "An aerospace engineer, the only one of the four without a doctorate and the only one who has been to space. He spent years performing a confidence he did not have, and stopped roughly when someone believed him."),
    ("Raj Koothrappali", "Character", "An astrophysicist from New Delhi whose voice used to abandon him around women, which made him the most eloquent person in the room and the least heard. He wants to be chosen more than he wants to choose."),
    ("Amy Farrah Fowler", "Character", "A neurobiologist who met Sheldon through an algorithm and stayed by choice, which is the harder of the two. She studied friendship as a subject for years before she was offered one, and she knew exactly what she was being given."),
    ("Bernadette Rostenkowski", "Character", "A microbiologist with a very small voice and a very large will. She works with organisms that could empty a city and is, by some distance, the most frightening person any of them know."),
    ("Stuart Bloom", "Character", "The owner of the comic book store, permanently one bad month from closing and permanently there anyway. He is the group's fifth member by attrition rather than invitation, which he knows and mentions."),

    ("Apartment 4A", "Place", "Fourth floor, no working lift, and a flight of stairs that has hosted more of the important conversations than the living room has. The couch faces a television nobody chose together, and the seat nearest the window is not available."),
    ("Apartment 4B", "Place", "Across the hall, which is the entire reason any of this happened. Geography did what none of them would have managed deliberately: it put a stranger inside the routine and left her there."),
    ("The Cheesecake Factory", "Place", "A restaurant with a menu the size of a paperback, used mostly as a waiting room for other lives. Two of them worked here before their real work started, and neither mentions it at the same volume."),
    ("The Comic Center of Pasadena", "Place", "A shop that functions as a clubhouse for people who never agreed to join a club. The arguments that happen here are about continuity, and they are never really about continuity."),
    ("Belo Horizonte", "Place", "A real city, and the only entity here that exists outside the collection in a way an atlas could confirm. Where the you-node was born."),
    ("Galveston", "Place", "A city on the Texas coast. It supplies the accent that appears under stress, the mother who is the only recognised authority, and a childhood that gets described as evidence rather than as memory."),

    ("Caltech", "Organization", "The institute where four of them work and where none of them entirely belong. It is less a workplace than a shared condition: the same corridors, the same cafeteria, the same argument about whose field is real."),
    ("NASA", "Organization", "The agency that put an engineer on the International Space Station for eleven days and thereby gave him material for the rest of his life. It is referenced more often than it is thought about."),

    ("Sheldon's Spot", "Object", "A single cushion on a sofa, defended by argument rather than by force. In an ever-changing world it is his one fixed point, and he will explain the reasoning — draught, sightline, angle to the television — to anyone who sits there."),
    ("The Whiteboard", "Object", "Where the equations live. Erasing it without permission is a declaration of war, and correcting it without permission is worse, because it implies the correction was available."),
    ("Soft Kitty", "Object", "A lullaby about a warm ball of fur, deployed strictly during illness and never for comfort in general. The rules around it are precise, unwritten, and enforced."),
    ("The Roommate Agreement", "Object", "A contract governing a friendship, with clauses for events that have never occurred and one or two that cannot. It was signed unread, which becomes relevant about once a year."),
    ("The Mars Rover", "Object", "A vehicle on another planet, briefly driven into a ditch to impress someone who was never going to be impressed. It is still up there, and so is the ditch."),

    ("String Theory", "Concept", "The idea that the smallest things are not points but vibrating strings, and that the universe has more dimensions than anyone can picture. For one of them it is a career; for the rest, a reliable way to start an argument."),
    ("Bazinga", "Concept", "A word appended to a statement in order to declare, retroactively, that it was a joke. It works only for the speaker, which is what makes it useful to him and unbearable to everyone else."),
    ("Sarcasm", "Concept", "Saying the opposite of what you mean and expecting to be understood anyway. It requires a shared assumption about what is obvious, which is exactly the assumption one of them cannot make."),
    ("Friendship", "Concept", "A relationship with no contract, no clauses and no agreed procedure for repair. That absence is what makes it valuable and what makes it, for some people, almost impossible to enter."),
    ("The Doppler Effect", "Concept", "The way a sound changes pitch as its source moves past you. Once worn as a costume to a party where nobody guessed, an outcome that was recorded as the party's failure."),
    ("Germs", "Concept", "Organisms too small to see and consequential enough to reorganise an entire life around. The fear of them is not irrational so much as unbounded: there is no amount of washing that constitutes enough."),
]

# the other lores, smaller. Each list is only what that lore adds: an entity
# that lives in two lores is written once, and joined to the second below.
MORE = {
    "DC Comics": [
        ("Batman", "Character", "A man who answered one bad night by deciding that every night would be his. The costume is the least strange part of the arrangement."),
        ("The Joker", "Character", "A villain with no fixed origin, because he tells a different one every time he is asked. He needs the Batman more than anyone in Gotham does."),
        ("Harley Quinn", "Character", "A psychiatrist who went into Arkham to treat a patient and came out as his accomplice, and later as nobody's."),
        ("Superman", "Character", "The strongest being on Earth, raised on a Kansas farm into the most polite one. His whole difficulty is restraint."),
        ("Lex Luthor", "Character", "A genius who cannot forgive Superman for being admired without having earned it."),
        ("Wonder Woman", "Character", "An Amazon who left an island at peace to argue with a world at war, and who keeps expecting better of people just often enough to be right."),
        ("The Flash", "Character", "The fastest man alive, and still somehow late. Also the costume four friends once chose for the same party without consulting each other."),
        ("Gotham City", "Place", "A city where it is always night in the comics and always raining in the films. It breeds its villains and the one man who refuses to leave."),
        ("Metropolis", "Place", "Gotham turned inside out: daylight, glass, and a sky someone is always flying through."),
        ("Arkham Asylum", "Place", "Where Gotham keeps what it cannot cure. The doors have always been more of a suggestion."),
        ("The Batcave", "Place", "The basement of a mansion, grown into a second life with better equipment than the first."),
        ("Justice League", "Organization", "People who could each save the world alone, meeting regularly to argue about how."),
        ("Kryptonite", "Object", "A piece of a dead planet, and the only thing that makes the strongest man on Earth ordinary."),
        ("Vengeance", "Concept", "Wanting the past to be paid for. Called justice when it wears a costume, and something else when it does not."),
    ],
    "Songs I Love": [
        ("Bohemian Rhapsody", "Music", "Six minutes that refuse to be one song, and ended up everyone's anyway."),
        ("Under Pressure", "Music", "Two voices built for stadiums, meeting in a small room and leaving the bass line behind for everyone."),
        ("Queen", "Organization", "Four people who could each have been the band, and chose to be one."),
        ("Freddie Mercury", "Person", "Born in Zanzibar, schooled in India, and the owner of a voice made for rooms larger than any that existed yet."),
        ("David Bowie", "Person", "A musician who changed his face every few years so the songs would not have to repeat themselves."),
        ("Clube da Esquina", "Music", "An album named after a street corner where friends met to play, and the sound of a whole city in the seventies."),
        ("Milton Nascimento", "Person", "A voice that sounds as if it were coming from further away than the room it is in."),
        ("Lô Borges", "Person", "Barely twenty when the corner became an album, and the one who kept writing the melodies nobody else would have tried."),
    ],
    "Corinthians": [
        ("Sport Club Corinthians Paulista", "Organization", "A club founded in 1910 by workers in Bom Retiro, named after an English team on tour, and owned ever since by the people in the stands more than by anyone on paper."),
        ("Neo Química Arena", "Place", "The stadium in Itaquera, in the east of the city, built for the opening of the 2014 World Cup. The north stand is where the noise is made."),
        ("Parque São Jorge", "Place", "The old ground in Tatuapé, and still the heart of the club: the headquarters, the chapel, the memorial."),
        ("Sócrates", "Person", "A doctor who played midfield with his heel as often as with his foot, and who treated a dressing room as a place to vote."),
        ("Democracia Corinthiana", "Concept", "The early eighties, when the players decided everything by vote - training, travel, what went on the shirt - while the country outside still could not."),
        ("Cássio", "Person", "A goalkeeper who arrived as a reserve in 2012 and, within months, made the saves that decided the best year the club ever had."),
        ("Paolo Guerrero", "Person", "The Peruvian striker whose header in Yokohama won the world."),
        ("Club World Cup 2012", "Event", "Yokohama, December 2012: one goal to nothing against Chelsea, watched by thousands who had crossed the planet to be there."),
        ("Gaviões da Fiel", "Organization", "The largest organised supporters' group, founded in 1969 - as much a samba school and a political voice as a stand."),
        ("Palmeiras", "Organization", "The rival across the city. The Derby has been played since 1917, and nobody in either house has ever called it just a game."),
        ("Ronaldo", "Person", "A World Cup winner who came home in 2009 with his knees half gone, and still scored the goals the club needed."),
        ("Loyalty", "Concept", "Staying when leaving would be easier, and not calling it a sacrifice."),
    ],
    "Games": [
        ("Batman: Arkham Asylum", "Game", "Batman locked inside the asylum with everyone he ever put there: one night, one building, and the Joker on the speakers."),
        ("Halo", "Game", "A soldier in green armour, a world shaped like a ring, and the reason one night of the week was never free."),
        ("Super Mario Bros.", "Game", "A plumber, a princess who is always in another castle, and the first world a generation learned by heart."),
        ("Mario", "Character", "A plumber who has never been seen plumbing, and has jumped more than anyone alive."),
        ("Bowser", "Character", "A king of turtles who takes the same princess every time, loses to the same plumber every time, and keeps coming back."),
        ("The Legend of Zelda: Ocarina of Time", "Game", "A boy with a sword and an ocarina, travelling between childhood and adulthood by playing a song."),
        ("Link", "Character", "A hero who never speaks, so that whoever holds the controller can."),
        ("Hyrule", "Place", "A kingdom rebuilt from scratch in every game, and somehow always recognisable."),
        ("Rivalry", "Concept", "Needing an opponent to know who you are."),
    ],
    "HQ's": [
        ("Batman: The Killing Joke", "Comic", "One bad day, told twice: the origin of the Joker as he chooses to remember it, and a night that went further than any Batman story before it."),
        ("Watchmen", "Comic", "Heroes as they would actually turn out, and a clock moving toward midnight through every chapter."),
        ("Alan Moore", "Person", "A writer who took costumed heroes more seriously than anyone before him, and then asked for his name to be taken off the films."),
        ("The Sandman", "Comic", "The lord of dreams, and seventy-five issues about stories: who tells them, and what they cost."),
        ("Neil Gaiman", "Person", "A writer who made myth sound like something overheard at the next table."),
        ("Turma da Mônica", "Comic", "A street in the Limoeiro neighbourhood, a girl with a stuffed rabbit, and the first comic most Brazilian children ever read."),
        ("Mônica", "Character", "Short, strong, and armed with a blue rabbit called Sansão. The plans of the street to defeat her never work."),
        ("Mauricio de Sousa", "Person", "A cartoonist who drew his own daughter, and then kept drawing for more than sixty years."),
    ],
    "Nebula": [
        ("Nostalgia", "Concept", "Missing a place that no longer exists in the form you remember, and sometimes never did."),
    ],
}

ents = {}
for name, type_name, description in ENTITIES + [e for more in MORE.values() for e in more]:
    e = Entity(
        name=name,
        entity_type_id=types[type_name].id,
        description=description,
        attributes={},
        owner_id=dev.id,
    )
    db.add(e)
    ents[name] = e
db.flush()

# now the entity exists, so the user can point at it
dev.self_entity_id = ents["dev"].id

# ---------------------------------------------------------- relationships
# (source, label, target, weight, gloss)
R = [
    # you
    ("dev", "loves", "Sheldon Cooper", 3, "Not because he is right, but because he is never in doubt."),
    ("dev", "quotes", "Bazinga", 2, None),
    ("dev", "lives on", "Sarcasm", 3, "Which is why the one character who cannot hear it is the funniest."),
    ("dev", "admires", "Amy Farrah Fowler", 2, "She chose the hardest person in the room and made it look deliberate."),
    ("dev", "born in", "Belo Horizonte", 3, "Not chosen, and still the first thing on the card."),
    ("dev", "rewatches", "Apartment 4A", 1, "The same four walls, and somehow never the same episode twice."),

    # Sheldon
    ("Sheldon Cooper", "roommate of", "Leonard Hofstadter", 3, "An arrangement that began as economics and became the spine of both lives."),
    ("Sheldon Cooper", "lives in", "Apartment 4A", 3, None),
    ("Sheldon Cooper", "works at", "Caltech", 2, None),
    ("Sheldon Cooper", "studies", "String Theory", 3, "Abandoned once, publicly, and returned to like a person returning to a marriage."),
    ("Sheldon Cooper", "owns", "Sheldon's Spot", 3, "In an ever-changing world it is his single point of consistency. He will explain why, at length."),
    ("Sheldon Cooper", "says", "Bazinga", 2, "A word that converts an insult into a joke after the fact, and only for the speaker."),
    ("Sheldon Cooper", "born in", "Galveston", 2, None),
    ("Sheldon Cooper", "boyfriend of", "Amy Farrah Fowler", 3, "A relationship negotiated in writing before it was ever felt."),
    ("Sheldon Cooper", "wrote", "The Roommate Agreement", 2, "Including a clause for the day one of them develops superpowers."),
    ("Sheldon Cooper", "cannot hear", "Sarcasm", 3, "The one frequency he is deaf to, in a man who hears everything else."),
    ("Sheldon Cooper", "fears", "Germs", 2, None),
    ("Sheldon Cooper", "uses", "The Whiteboard", 2, None),
    ("Sheldon Cooper", "sings", "Soft Kitty", 1, "Only when ill. He will specify the number of verses."),
    ("Sheldon Cooper", "dressed as", "The Doppler Effect", 1, "At a costume party. Nobody guessed, and he considered that their failure."),

    # Leonard
    ("Leonard Hofstadter", "lives in", "Apartment 4A", 3, None),
    ("Leonard Hofstadter", "works at", "Caltech", 2, None),
    ("Leonard Hofstadter", "loves", "Penny", 3, "Immediately, and for far longer than was reasonable."),
    ("Leonard Hofstadter", "friend of", "Howard Wolowitz", 2, None),
    ("Leonard Hofstadter", "friend of", "Raj Koothrappali", 2, None),
    ("Leonard Hofstadter", "signed", "The Roommate Agreement", 2, "Without reading it, which becomes relevant roughly once a season."),

    # Penny
    ("Penny", "lives in", "Apartment 4B", 3, "Across the hall, which is the only reason any of this happened."),
    ("Penny", "works at", "The Cheesecake Factory", 2, None),
    ("Penny", "sings", "Soft Kitty", 2, "She is the one who taught it to him, and the only one he will accept it from."),
    ("Penny", "friend of", "Amy Farrah Fowler", 3, "The friendship Amy had been waiting her whole life to be offered."),

    # Howard
    ("Howard Wolowitz", "works at", "Caltech", 2, None),
    ("Howard Wolowitz", "built", "The Mars Rover", 2, "And then drove it into a ditch trying to impress a woman."),
    ("Howard Wolowitz", "flew with", "NASA", 3, "Six months of training, eleven days in orbit, and a lifetime of bringing it up."),
    ("Howard Wolowitz", "married to", "Bernadette Rostenkowski", 3, None),
    ("Howard Wolowitz", "friend of", "Raj Koothrappali", 3, "A friendship so close the others stopped asking about it."),

    # Raj
    ("Raj Koothrappali", "works at", "Caltech", 2, None),
    ("Raj Koothrappali", "cannot speak to", "Penny", 2, "Selective mutism, cured only by alcohol and, eventually, by time."),
    ("Raj Koothrappali", "visits", "The Comic Center of Pasadena", 1, None),

    # Amy
    ("Amy Farrah Fowler", "works at", "Caltech", 2, None),
    ("Amy Farrah Fowler", "studies", "Friendship", 2, "Academically first, and then not."),

    # Bernadette
    ("Bernadette Rostenkowski", "worked at", "The Cheesecake Factory", 1, "Before the doctorate, and she will remind you which of them finished first."),
    ("Bernadette Rostenkowski", "friend of", "Penny", 2, None),

    # Stuart
    ("Stuart Bloom", "owns", "The Comic Center of Pasadena", 3, None),
    ("Stuart Bloom", "friend of", "Howard Wolowitz", 1, "In the way that a person who is always there eventually becomes a friend."),

    # second pass: the leaves get outgoing edges of their own
    ("Apartment 4A", "faces", "Apartment 4B", 2, "One door, and the entire premise of the thing."),
    ("Apartment 4B", "belongs to", "Penny", 2, None),
    ("Caltech", "employs", "Sheldon Cooper", 1, None),
    ("Caltech", "employs", "Amy Farrah Fowler", 1, None),
    ("The Cheesecake Factory", "employed", "Penny", 1, None),
    ("The Comic Center of Pasadena", "hosts", "Friendship", 1, "Four grown men arguing about continuity is what it looks like from outside."),
    ("Sheldon's Spot", "sits in", "Apartment 4A", 2, None),
    ("The Whiteboard", "holds", "String Theory", 2, "Whatever is on it at the time is the thing he is losing sleep over."),
    ("Soft Kitty", "cures", "Germs", 1, "It does not. That is not the point of it."),
    ("The Roommate Agreement", "governs", "Apartment 4A", 2, None),
    ("The Mars Rover", "belongs to", "NASA", 2, None),
    ("String Theory", "explains", "The Doppler Effect", 1, None),
    ("Bazinga", "disguises", "Sarcasm", 2, "A joke declared after the fact is a way of not having meant it."),
    ("Sarcasm", "requires", "Friendship", 2, "You can only say the opposite of what you mean to someone who knows what you mean."),
    ("Germs", "haunt", "Sheldon Cooper", 3, None),
    ("Galveston", "raised", "Sheldon Cooper", 2, "Every certainty he has, he got from a place he describes as having escaped."),
    ("NASA", "flew", "Howard Wolowitz", 2, None),
    ("Friendship", "survives", "The Roommate Agreement", 1, "Despite it, most weeks."),
    ("The Doppler Effect", "passes", "Galveston", 1, None),
    ("Amy Farrah Fowler", "friend of", "Bernadette Rostenkowski", 2, None),
    ("Bernadette Rostenkowski", "works at", "Caltech", 1, None),
    ("Stuart Bloom", "sells", "Friendship", 1, "Not on purpose, and not at a price that covers rent."),
    ("Penny", "sat in", "Sheldon's Spot", 1, "Once. Deliberately. It is still brought up."),
    ("Leonard Hofstadter", "lives with", "The Roommate Agreement", 2, None),
    ("Raj Koothrappali", "studies", "String Theory", 1, None),
    ("Howard Wolowitz", "mocks", "String Theory", 2, "The only field that cannot be tested, defended by the only man who cannot be corrected."),

    # the costume party: four Flashes, and the reason The Flash lives in both lores
    ("Sheldon Cooper", "dressed as", "The Flash", 2, "So did the other three, which none of them could let go of."),
    ("Leonard Hofstadter", "dressed as", "The Flash", 1, None),
    ("The Comic Center of Pasadena", "stocks", "Batman", 1, None),

    # DC Comics
    ("dev", "grew up with", "Batman", 2, "The first one who made the dark look like a choice."),
    ("dev", "understands", "Vengeance", 1, "Without approving of it."),
    ("Batman", "fights", "The Joker", 3, "Neither would know who he was without the other."),
    ("Batman", "protects", "Gotham City", 3, None),
    ("Batman", "lives in", "The Batcave", 2, None),
    ("Batman", "member of", "Justice League", 2, None),
    ("Batman", "driven by", "Vengeance", 3, "He calls it justice. The cave suggests otherwise."),
    ("The Joker", "escapes", "Arkham Asylum", 3, "Routinely, and never quite the same way twice."),
    ("Harley Quinn", "worked at", "Arkham Asylum", 2, None),
    ("Harley Quinn", "in love with", "The Joker", 2, "Until she was not, which is the better story."),
    ("Superman", "protects", "Metropolis", 3, None),
    ("Superman", "weakened by", "Kryptonite", 3, None),
    ("Superman", "member of", "Justice League", 2, None),
    ("Lex Luthor", "hates", "Superman", 3, "Envy dressed as principle."),
    ("Lex Luthor", "keeps", "Kryptonite", 2, None),
    ("Wonder Woman", "member of", "Justice League", 2, None),
    ("The Flash", "member of", "Justice League", 2, None),
    ("Arkham Asylum", "stands in", "Gotham City", 2, None),
    ("Gotham City", "mirrors", "Metropolis", 1, "Night and day, drawn by the same company."),
    ("The Joker", "lives for", "Rivalry", 2, "Without Batman, he has said, he would simply be bored."),

    # Songs I Love
    ("dev", "sings along to", "Bohemian Rhapsody", 2, "Every part, including the ones written for a choir."),
    ("dev", "grew up with", "Clube da Esquina", 3, "The sound of the city before the city was a choice."),
    ("Queen", "recorded", "Bohemian Rhapsody", 3, None),
    ("Queen", "recorded", "Under Pressure", 2, None),
    ("Freddie Mercury", "fronted", "Queen", 3, None),
    ("Freddie Mercury", "sang", "Under Pressure", 2, None),
    ("David Bowie", "sang", "Under Pressure", 2, "Half of it, in a studio he happened to be passing."),
    ("Milton Nascimento", "recorded", "Clube da Esquina", 3, None),
    ("Lô Borges", "recorded", "Clube da Esquina", 3, None),
    ("Clube da Esquina", "born in", "Belo Horizonte", 3, "On an actual corner, in Santa Tereza."),
    ("Clube da Esquina", "carries", "Nostalgia", 2, None),

    # Corinthians
    ("dev", "supports", "Sport Club Corinthians Paulista", 3, "A loyalty older than any reason for it."),
    ("dev", "celebrated", "Club World Cup 2012", 2, "Awake before dawn, for a final played on the other side of the world."),
    ("Sport Club Corinthians Paulista", "plays at", "Neo Química Arena", 3, None),
    ("Sport Club Corinthians Paulista", "keeps its heart at", "Parque São Jorge", 2, None),
    ("Sport Club Corinthians Paulista", "won", "Club World Cup 2012", 3, None),
    ("Sport Club Corinthians Paulista", "plays the Derby against", "Palmeiras", 3, None),
    ("Paolo Guerrero", "scored in", "Club World Cup 2012", 3, "The only goal of the final, a header at the far post."),
    ("Cássio", "saved", "Club World Cup 2012", 3, None),
    ("Sócrates", "played for", "Sport Club Corinthians Paulista", 3, None),
    ("Sócrates", "led", "Democracia Corinthiana", 3, "With a vote of his own, and never more than one."),
    ("Ronaldo", "played for", "Sport Club Corinthians Paulista", 2, None),
    ("Gaviões da Fiel", "sings for", "Sport Club Corinthians Paulista", 3, None),
    ("Gaviões da Fiel", "embodies", "Loyalty", 2, None),
    ("Palmeiras", "feeds", "Rivalry", 3, "The Derby, since 1917."),
    ("Friendship", "rests on", "Loyalty", 1, None),

    # Games - and Halo night, the reason Halo lives in the show's lore too
    ("dev", "played", "Batman: Arkham Asylum", 2, "Every corridor of it, more than once."),
    ("dev", "grew up with", "Super Mario Bros.", 2, "The first world learned by heart."),
    ("Batman: Arkham Asylum", "set in", "Arkham Asylum", 3, None),
    ("Batman: Arkham Asylum", "stars", "Batman", 3, None),
    ("Howard Wolowitz", "plays", "Halo", 2, "Wednesday is Halo night, and Wednesday is not negotiable."),
    ("Leonard Hofstadter", "plays", "Halo", 1, None),
    ("Raj Koothrappali", "plays", "Halo", 1, None),
    ("Mario", "appears in", "Super Mario Bros.", 3, None),
    ("Bowser", "appears in", "Super Mario Bros.", 3, None),
    ("Mario", "rescues the princess from", "Bowser", 2, "From another castle, every time."),
    ("Bowser", "keeps", "Rivalry", 2, None),
    ("Link", "appears in", "The Legend of Zelda: Ocarina of Time", 3, None),
    ("Link", "defends", "Hyrule", 3, None),
    ("The Legend of Zelda: Ocarina of Time", "set in", "Hyrule", 2, None),
    ("Super Mario Bros.", "carries", "Nostalgia", 2, None),

    # HQ's
    ("dev", "grew up with", "Turma da Mônica", 3, "Before reading was even the point."),
    ("dev", "rereads", "The Sandman", 1, None),
    ("Alan Moore", "wrote", "Watchmen", 3, None),
    ("Alan Moore", "wrote", "Batman: The Killing Joke", 3, None),
    ("Batman: The Killing Joke", "tells the origin of", "The Joker", 3, "One version of it. He prefers his past multiple choice."),
    ("Neil Gaiman", "wrote", "The Sandman", 3, None),
    ("Mauricio de Sousa", "created", "Turma da Mônica", 3, None),
    ("Mônica", "appears in", "Turma da Mônica", 3, None),
    ("The Comic Center of Pasadena", "stocks", "Watchmen", 1, None),
]

# -------------------------------------------------------------------- lores
# A lore is a slice, not a container: the same entity can belong to several.
# Nebula is the one every account starts with. In astronomy a nebula is both
# the nursery where stars form and the shapeless cloud that has not become
# anything yet, which is exactly the two jobs this lore has to do - it starts
# as everything, and ends up as everything else.
LORES = [
    ("Nebula", "Where things arrive before they belong anywhere. It starts as all you have, and becomes all that is left over."),
    ("The Big Bang Theory", "Four physicists, a waitress across the hall, and the apartment that held them."),
    ("DC Comics", "Two cities, one at night and one by day, and the people who cannot leave either of them alone."),
    ("Songs I Love", "What plays when nobody else is choosing."),
    ("Corinthians", "A club, a stadium, a stand, and the people who never once left."),
    ("Games", "Worlds learned by heart, one controller at a time."),
    ("HQ's", "Comics: the panels, the people who drew them, and the ones who read them too young."),
]

lores = {}
for nome, desc in LORES:
    lore = Lore(name=nome, description=desc, owner_id=dev.id)
    db.add(lore)
    lores[nome] = lore
db.flush()

# the account points at its Nebula: that, not the name, is what makes it the
# place new entities arrive. Renaming it later changes nothing.
dev.nebula_lore_id = lores["Nebula"].id

# Every entity belongs to at least one lore, except the one that IS you. The
# you-node sits outside the slicing for the same reason it sits outside the
# force simulation: it is the frame, not the content. The screen draws it apart
# from the entity list, so it appears whichever lore is open.
#
# Belo Horizonte is not from the show, so it is not in the show's lore. It sits
# in Nebula, where things that belong to no particular slice arrive.
FORA_DA_SERIE = {"dev", "Belo Horizonte"}

for nome, _, _ in ENTITIES:
    if nome in FORA_DA_SERIE:
        continue
    db.add(EntityLore(entity_id=ents[nome].id, lore_id=lores["The Big Bang Theory"].id))

# each smaller lore holds what its list added
for lore_name, more in MORE.items():
    for nome, _, _ in more:
        db.add(EntityLore(entity_id=ents[nome].id, lore_id=lores[lore_name].id))

# these sit in more than one, which is the whole point of a slice. Two lores
# that share an entity touch in the sky, with a bridge between them
BOTH = [
    ("Sarcasm", "Nebula"),
    ("Friendship", "Nebula"),
    ("Bazinga", "Nebula"),
    ("Belo Horizonte", "Nebula"),
    ("The Flash", "The Big Bang Theory"),
    ("Vengeance", "Nebula"),
    ("Soft Kitty", "Songs I Love"),
    ("Belo Horizonte", "Songs I Love"),
    ("Halo", "The Big Bang Theory"),
    ("Batman: Arkham Asylum", "DC Comics"),
    ("Batman: The Killing Joke", "DC Comics"),
    ("Loyalty", "Nebula"),
    # three homes at once: the Joker, the Derby and Bowser all need someone
    ("Rivalry", "DC Comics"),
    ("Rivalry", "Corinthians"),
]
for nome, lore_name in BOTH:
    db.add(EntityLore(entity_id=ents[nome].id, lore_id=lores[lore_name].id))

# --------------------------------------------------------------- the dates
# The system keeps the structure, the person names the meaning: there is no
# rule saying a Person has a birth and a Movie has a release. You write the
# label that fits, and one entity can hold several.
DATES = [
    ("dev", date(1996, 3, 14), "born"),

    ("Sheldon Cooper", date(1980, 2, 26), "born"),
    ("Sheldon Cooper", date(2007, 9, 24), "first appeared"),
    ("Leonard Hofstadter", date(1980, 5, 17), "born"),
    ("Penny", date(1985, 12, 2), "born"),
    ("Howard Wolowitz", date(1981, 4, 8), "born"),
    ("Raj Koothrappali", date(1981, 10, 6), "born"),
    ("Amy Farrah Fowler", date(2010, 5, 24), "first appeared"),
    ("Bernadette Rostenkowski", date(2009, 3, 9), "first appeared"),
    ("Stuart Bloom", date(2008, 10, 20), "first appeared"),

    ("The Mars Rover", date(2010, 2, 22), "driven into a ditch"),
    ("Howard Wolowitz", date(2012, 5, 10), "went to space"),
    ("Howard Wolowitz", date(2012, 9, 27), "came back"),

    ("The Roommate Agreement", date(2003, 11, 1), "signed"),
    ("Apartment 4B", date(2007, 9, 24), "she moved in"),

    ("Sport Club Corinthians Paulista", date(1910, 9, 1), "founded"),
    ("Club World Cup 2012", date(2012, 12, 16), "final"),
]

datas = {}
for nome, quando, rotulo in DATES:
    d = EntityDate(entity_id=ents[nome].id, date=quando, label=rotulo)
    db.add(d)
    datas[(nome, rotulo)] = d
db.flush()

# the account's date of birth is not a copy: it points at the you-node's own
# date, so editing the date on the card is editing the registration
dev.birth_date_id = datas[("dev", "born")].id

for source, label, target, weight, gloss in R:
    db.add(Relationship(
        source_id=ents[source].id,
        target_id=ents[target].id,
        label=label,
        weight=weight,
        gloss=gloss,
    ))

db.commit()

print(f"  types           {db.query(EntityType).count()}")
print(f"  entities        {db.query(Entity).count()}")
print(f"  relationships   {db.query(Relationship).count()}")
print(f"  with a gloss    {db.query(Relationship).filter(Relationship.gloss.isnot(None)).count()}")
print(f"  dates           {db.query(EntityDate).count()}")
print(f"  lores           {db.query(Lore).count()}")
print(f"  memberships     {db.query(EntityLore).count()}")
print(f"  user            {dev.email!r}, self_entity_id={dev.self_entity_id}, birth_date_id={dev.birth_date_id}, nebula_lore_id={dev.nebula_lore_id}")
db.close()

"""Fill a database with a small Big Bang Theory collection, for development.

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
from app.models import User, EntityType, Entity, Relationship, Lore, EntityLore

db = SessionLocal()

if "--reset" in sys.argv:
    # order matters: children before parents, or the foreign keys refuse
    db.query(EntityLore).delete()
    db.query(Relationship).delete()
    db.query(Lore).delete()
    db.query(User).update({User.self_entity_id: None})
    db.query(Entity).delete()
    db.query(User).delete()
    db.query(EntityType).delete()
    db.commit()

if db.query(Entity).count() > 0:
    raise SystemExit("this database already holds entities; pass --reset to replace them")

# ------------------------------------------------------------------ types
TYPES = ["Character", "Place", "Object", "Concept", "Organization", "Person"]
types = {}
for name in TYPES:
    t = EntityType(name=name)
    db.add(t)
    types[name] = t
db.flush()

# ------------------------------------------------------------------- user
# the user is born first, pointing at nothing: the entity does not exist yet
dev = User(name="dev", email="dev@lorepsum.local")
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

ents = {}
for name, type_name, description in ENTITIES:
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
]

lores = {}
for nome, desc in LORES:
    lore = Lore(name=nome, description=desc, owner_id=dev.id)
    db.add(lore)
    lores[nome] = lore
db.flush()

# Every entity belongs to at least one lore, except the one that IS you. The
# you-node sits outside the slicing for the same reason it sits outside the
# force simulation: it is the frame, not the content. The screen draws it apart
# from the entity list, so it appears whichever lore is open.
for nome, e in ents.items():
    if nome == "dev":
        continue
    db.add(EntityLore(entity_id=e.id, lore_id=lores["The Big Bang Theory"].id))

# a few sit in both, which is the whole point of a slice
for nome in ("Sarcasm", "Friendship", "Bazinga"):
    db.add(EntityLore(entity_id=ents[nome].id, lore_id=lores["Nebula"].id))

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
print(f"  lores           {db.query(Lore).count()}")
print(f"  memberships     {db.query(EntityLore).count()}")
print(f"  user            {dev.name!r}, self_entity_id={dev.self_entity_id}")
db.close()

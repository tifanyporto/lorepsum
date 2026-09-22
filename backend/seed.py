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
from app.models import User, EntityType, Entity, Relationship

db = SessionLocal()

if "--reset" in sys.argv:
    # order matters: children before parents, or the foreign keys refuse
    db.query(Relationship).delete()
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
    ("dev", "Person", "Where it all starts. Everything here is here because you put it here."),

    ("Sheldon Cooper", "Character", "A theoretical physicist who treats social convention as an optional protocol. Certainty is his default state."),
    ("Leonard Hofstadter", "Character", "An experimental physicist, and the one who keeps the apartment habitable in every sense."),
    ("Penny", "Character", "An aspiring actress from Nebraska who becomes the group's translator to the outside world."),
    ("Howard Wolowitz", "Character", "An aerospace engineer, the only one of the four without a doctorate, and the only one who has been to space."),
    ("Raj Koothrappali", "Character", "An astrophysicist from New Delhi whose voice used to abandon him around women."),
    ("Amy Farrah Fowler", "Character", "A neurobiologist who met Sheldon through an algorithm and stayed by choice."),
    ("Bernadette Rostenkowski", "Character", "A microbiologist with a very small voice and a very large will."),
    ("Stuart Bloom", "Character", "The owner of the comic book store, permanently one bad month from closing."),

    ("Apartment 4A", "Place", "Fourth floor, no working lift. The couch faces a television nobody chose together."),
    ("Apartment 4B", "Place", "Across the hall. The door that made the whole arrangement possible."),
    ("The Cheesecake Factory", "Place", "A restaurant with an enormous menu, used mostly as a waiting room for other lives."),
    ("The Comic Center of Pasadena", "Place", "A shop that functions as a clubhouse for people who never agreed to join a club."),
    ("Galveston", "Place", "A city in Texas. Where the accent comes from, and the mother."),

    ("Caltech", "Organization", "The institute where four of them work and where none of them entirely belong."),
    ("NASA", "Organization", "The agency that sent an engineer to the International Space Station and never let him forget it."),

    ("Sheldon's Spot", "Object", "A single cushion on a sofa, defended by argument rather than by force."),
    ("The Whiteboard", "Object", "Where the equations live. Erasing it without permission is a declaration of war."),
    ("Soft Kitty", "Object", "A lullaby about a warm ball of fur, deployed strictly for illness."),
    ("The Roommate Agreement", "Object", "A contract governing a friendship, with clauses for events that have never occurred."),
    ("The Mars Rover", "Object", "A vehicle on another planet, briefly driven into a ditch to impress someone."),

    ("String Theory", "Concept", "The idea that the smallest things are not points but vibrating strings. A career, and a way of arguing."),
    ("Bazinga", "Concept", "A word appended to a statement to retroactively declare it a joke."),
    ("Sarcasm", "Concept", "Saying the opposite of what you mean and expecting to be understood anyway."),
    ("Friendship", "Concept", "A relationship with no contract, which is precisely what makes it difficult for some."),
    ("The Doppler Effect", "Concept", "The way a sound changes pitch as its source moves past you."),
    ("Germs", "Concept", "Organisms too small to see, and large enough to reorganise an entire life around."),
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
]

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
print(f"  user            {dev.name!r}, self_entity_id={dev.self_entity_id}")
db.close()

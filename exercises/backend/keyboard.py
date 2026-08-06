class Keyboard:
    def __init__(self, color, size, key_type):
        self.color = color
        self.size = size
        self.key_type = key_type       
    def __str__(self):
        return f"Keyboard: {self.color}, {self.size}, {self.key_type}"
    def press_key(self, key):
            #self.key = key
        return f'pressed key by {self.color} Keyboard: {key}'

purple_keyboard = Keyboard(
    color="purple", 
    size="75%", 
    key_type="magnetic"
    )

black_keyboard = Keyboard(
    color="black", 
    size="60%", 
    key_type="mechanic"
    ) 

print(purple_keyboard,'\n ', black_keyboard)

print(purple_keyboard.press_key('a'))
print(black_keyboard.press_key('b'))
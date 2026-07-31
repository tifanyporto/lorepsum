
class Car:
    def workshop(self, color): # <- fabrica
        self.color = color
        def decorator(func): # <- decorator
            def warpper(): # <- Wrapper   
                message = func()
                print(f'My car was painted {color}, {message}')
                return message
            return warpper
        return decorator


app = Car()
@app.workshop('blue')
def paint_blue():
    myFavoriteColor ='cs blue is my favorite color'
    return myFavoriteColor

paint_blue()

@app.workshop('purple')
def paint_purple():
    myCar = {
        "year": 1999,
        "brand": "audi"
    }
    #myFavoriteColor = f'i changed my mind, i like purple'
    return f"it's a {myCar['year']} {myCar['brand']}"

paint_purple()
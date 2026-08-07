class Car:
    def __init__(self, year):
        self.year = year
    def cars_year(self):
        return f"my car is a {self.year} model"

class Audi(Car):
    def set_brand(self, brand):
        self.brand = brand
        return f'and is a {self.brand}'


car = Audi('1999')

print(car.cars_year())
print(car.set_brand('Audi'))



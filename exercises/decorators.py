
def func_1():
    return f"Sou a {func_1.__name__}!"

def func_2(func):
    def func_3():
        message = func()
        print(f"2. Execução da {func.__name__} via {func_3.__name__}: {message}")
        return f'Sou a {func.__name__}!'
    return func_3

print(f"1. Retorno da função número 2: {func_2(func_1)} (funcao número 3)")

# result = func_3(func_1)
result = func_2(func_1)
print(f'3. função número 3 retornada da função numero 2: {result()}')

@func_2
def func_4():
    return f"Sou a {func_4.__name__}!"

#func_4 = func_2(func_4)
func_4()
print(f"{func_2(func_4)} < retorna a função wrapper (func_3)")

def fabrica(param):
    return func_2



@fabrica('oi')
def teste():
    return 'teste'

teste()
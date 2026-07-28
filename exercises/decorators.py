

def func_1():
    return "Sou a função número 1!"

def func_2(func):
    def func_3():
        message = func()
        print(f"2. Execução da função numero 1 via função numero 3: {message}")
        return 'Sou a função número 3!'
    return func_3

print(f"1. Retorno da função número 2: {func_2(func_1)} (funcao número 3)")
result = func_2(func_1)
print(f'3. função número 3 retornada da função numero 2:{result()}')

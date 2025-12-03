# Python list comprehensions cheat sheet

Useful Python list comprehension patterns: 1) Basic: [x*2 for x in range(10)] - doubles numbers. 2) With condition: [x for x in range(20) if x % 2 == 0] - even numbers only. 3) Nested: [x+y for x in [1,2] for y in [3,4]] - gives [4,5,5,6]. 4) With function: [len(word) for word in ["hello", "world"]] - word lengths. 5) Dictionary comp: {x: x**2 for x in range(5)} - numbers to squares dict.

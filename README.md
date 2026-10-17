# ∑ Polynomial Lab: Polynomial Operation System Using Arrays

A college **Data Structures** project. Polynomials are stored in plain arrays, where the coefficient of x^k sits at **index k**. For example, `3x² + 2x + 5` is stored as `[5, 2, 3]`.

Built with HTML5, CSS3 and vanilla JavaScript. No frameworks and no build step.

## Features

- Add, subtract, multiply and divide polynomials (degree 0 to 10)
- Derivative and integral of P(x) or Q(x)
- Evaluate P, Q and the result at any x using Horner's method
- Graph of P(x), Q(x) and the result
- Step-by-step explanation and raw array output for every operation
- Calculation history and a copy-result button
- Input validation with friendly error messages
- Responsive layout for desktop, tablet and mobile

## Algorithms and complexity

| Operation | Idea | Time |
|---|---|---|
| Addition / Subtraction | pad to equal length, `R[k] = P[k] ± Q[k]` | O(max(n, m)) |
| Multiplication | convolution, `R[i+j] += P[i] * Q[j]` | O(n · m) |
| Division | long division from the highest index down | O(n · m) |
| Derivative / Integral | shift index by 1, multiply or divide by the power | O(n) |
| Evaluation | Horner's method | O(n) |

## Project structure

```
polynomial-lab/
├── index.html   # page structure and content
├── style.css    # theme and layout
├── script.js    # array-based polynomial algorithms and UI logic
└── README.md
```

## Run locally

Open `index.html` in any modern browser.

## Deploy on GitHub Pages

1. Push these files to a repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

## Project details

- **Subject:** Data Structures
- **Core concept:** Arrays
- **Language:** JavaScript
- **Students:** Atul Khandekar, Shivam Wande, Sneha Ghule, Adhrika Kumari
- **College:** JSPM RCOE, Tathawade

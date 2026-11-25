/* Квиз: состояние, подсчёт и отрисовка. */

const CHOICE_LETTERS = ["A", "B", "C", "D"];

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (value === true) node.setAttribute(key, "");
    else node.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function rangeText(score) {
  if (score === 5) return "Отлично: все пять связей разобраны верно.";
  if (score === 4) return "Одна ошибка: изучите разбор и вернитесь к этому механизму.";
  if (score === 3) return "Половина верных: повторите отдельные механизмы по разбору ниже.";
  return "Вернитесь к четырём мостам: базовые механизмы стоит разобрать заново.";
}

export function createQuiz(data) {
  const root = document.getElementById("quiz-root");
  const quiz = data.quiz;
  const state = {
    index: 0,
    selectedId: null,
    answers: [],
    phase: "select",
  };

  const caseTitle = (id) => data.cases.find((item) => item.id === id)?.title || `Кейс ${id}`;

  function caseLink(question) {
    if (!question.relatedCaseId) return null;
    const href = "#catalog";
    return el(
      "p",
      { class: "feedback-case" },
      el(
        "a",
        { href, dataset: { openCase: question.relatedCaseId } },
        `Открыть кейс ${question.relatedCaseId}: ${caseTitle(question.relatedCaseId)}`
      )
    );
  }

  function focusHeading(node) {
    if (!node) return;
    node.focus({ preventScroll: true });
  }

  function buildChoice(question, choice, answered) {
    const wrap = el("div", { class: "choice" });
    const inputId = `choice-${question.id}-${choice.id}`;
    const input = el("input", {
      type: "radio",
      name: "quiz-choice",
      id: inputId,
      value: choice.id,
      checked: state.selectedId === choice.id,
    });
    if (answered) input.disabled = true;

    const isCorrect = choice.id === question.correctId;
    const isChosen = choice.id === state.selectedId;
    let markText = "";
    if (answered && isCorrect) {
      wrap.classList.add("is-correct");
      markText = "Верный ответ";
    } else if (answered && isChosen) {
      wrap.classList.add("is-wrong");
      markText = "Ваш выбор";
    }

    const label = el(
      "label",
      { for: inputId },
      el("span", { class: "choice-letter", text: CHOICE_LETTERS[CHOICE_LETTERS.indexOf(choice.id)] || choice.id }),
      el("span", { text: choice.label }),
      markText ? el("span", { class: "choice-mark", text: markText }) : null
    );

    wrap.append(input, label);
    return wrap;
  }

  function questionView() {
    const question = quiz[state.index];
    const answered = state.phase === "feedback";
    const wrapper = el("div", { class: "quiz-card" });

    wrapper.append(
      el("p", { class: "quiz-progress", text: `Вопрос ${state.index + 1} из ${quiz.length}` })
    );

    const heading = el("h3", {
      class: "quiz-heading",
      id: "quiz-question-title",
      tabindex: "-1",
      text: question.title,
    });
    wrapper.append(heading);

    const form = el("form", { class: "quiz-form", novalidate: true });
    const fieldset = el("fieldset", {});
    fieldset.append(el("legend", { class: "quiz-prompt", text: question.prompt }));

    const choices = el("div", { class: "choices" });
    for (const choice of question.choices) {
      choices.append(buildChoice(question, choice, answered));
    }
    fieldset.append(choices);
    form.append(fieldset);

    if (!answered) {
      const confirm = el("button", {
        class: "btn btn-primary quiz-confirm",
        type: "submit",
        disabled: !state.selectedId,
        text: "Подтвердить",
      });
      form.append(el("div", { class: "quiz-actions" }, confirm));

      form.addEventListener("change", (event) => {
        const input = event.target.closest('input[type="radio"]');
        if (!input || state.phase !== "select") return;
        state.selectedId = input.value;
        confirm.disabled = false;
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (state.phase !== "select" || !state.selectedId) return;
        confirmAnswer();
      });
    } else {
      const isLast = state.index === quiz.length - 1;
      const next = el("button", {
        class: "btn btn-primary",
        type: "button",
        text: isLast ? "Показать результат" : "Следующий вопрос",
      });
      next.addEventListener("click", () => {
        if (state.phase !== "feedback") return;
        if (isLast) {
          state.phase = "result";
          render("result");
        } else {
          state.index += 1;
          state.selectedId = null;
          state.phase = "select";
          render("question");
        }
      });
      form.append(el("div", { class: "quiz-actions" }, next));
    }

    wrapper.append(form);

    if (answered) {
      const answer = state.answers[state.index];
      const isCorrect = Boolean(answer?.isCorrect);
      const feedback = el("div", { class: "feedback" });

      const verdict = el(
        "p",
        {
          class: `verdict ${isCorrect ? "verdict--correct" : "verdict--wrong"}`,
          tabindex: "-1",
          id: "quiz-verdict",
        },
        el("span", { class: "verdict-mark", "aria-hidden": "true", text: isCorrect ? "✓" : "×" }),
        el("span", { text: isCorrect ? "Верно" : "Неверно" })
      );

      feedback.append(
        verdict,
        el("p", { class: "feedback-text", text: question.feedback }),
        el("p", { class: "feedback-refs", text: `Стандарт: ${question.references}` }),
        caseLink(question)
      );
      wrapper.append(feedback);
    }

    return { wrapper, heading };
  }

  function resultView() {
    const score = state.answers.filter((answer) => answer.isCorrect).length;
    const wrapper = el("div", { class: "quiz-result" });

    const heading = el("h3", {
      class: "quiz-heading",
      id: "quiz-result-title",
      tabindex: "-1",
    });
    heading.append(
      "Результат: ",
      el("span", { class: "result-number", text: String(score) }),
      ` из ${quiz.length}`
    );

    wrapper.append(heading, el("p", { class: "result-text", text: rangeText(score) }));

    const mistakes = [];
    state.answers.forEach((answer, index) => {
      if (answer.isCorrect) return;
      const question = quiz[index];
      const chosen = question.choices.find((choice) => choice.id === answer.selectedId);
      const correct = question.choices.find((choice) => choice.id === question.correctId);
      const item = el(
        "li",
        { class: "mistake" },
        el("h4", { text: `Вопрос ${index + 1}. ${question.title}` }),
        el("p", { text: question.prompt }),
        el("p", {
          class: "answer-line",
          text: `Ваш ответ: ${answer.selectedId}. ${chosen?.label || "нет ответа"}. Верный ответ: ${question.correctId}. ${correct?.label || ""}.`,
        }),
        el("p", { text: question.feedback }),
        el("p", { class: "mistake-refs", text: `Стандарт: ${question.references}` }),
        caseLink(question)
      );
      mistakes.push(item);
    });

    if (mistakes.length) {
      wrapper.append(el("ol", { class: "mistakes" }, ...mistakes));
    } else {
      wrapper.append(el("p", { class: "result-text", text: "Ошибок нет - разбор не требуется." }));
    }

    const again = el("button", { class: "btn btn-secondary", type: "button", text: "Пройти ещё раз" });
    again.addEventListener("click", () => {
      state.index = 0;
      state.selectedId = null;
      state.answers = [];
      state.phase = "select";
      render("question");
    });
    wrapper.append(el("div", { class: "result-actions" }, again));

    return { wrapper, heading };
  }

  function confirmAnswer() {
    if (state.phase !== "select" || !state.selectedId) return;
    const question = quiz[state.index];
    const alreadyAnswered = state.answers.some((answer) => answer.questionId === question.id);
    if (alreadyAnswered) return;

    state.answers[state.index] = {
      questionId: question.id,
      selectedId: state.selectedId,
      isCorrect: state.selectedId === question.correctId,
    };
    state.phase = "feedback";
    render("feedback");
  }

  function render(focus = "none") {
    let view;
    if (state.phase === "result") {
      view = resultView();
    } else {
      view = questionView();
    }
    root.replaceChildren(view.wrapper);

    if (focus === "feedback") {
      focusHeading(document.getElementById("quiz-verdict"));
    } else if (focus === "result") {
      focusHeading(view.heading);
    } else if (focus === "question") {
      focusHeading(view.heading);
    }
  }

  render();
  return { render };
}

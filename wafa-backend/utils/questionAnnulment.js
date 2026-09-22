export const normalizeAnnulledQuestion = (options, isAnnulled) => {
    const resolvedIsAnnulled = isAnnulled === true;

    return {
        isAnnulled: resolvedIsAnnulled,
        options: resolvedIsAnnulled && Array.isArray(options)
            ? options.map((option) => ({ ...option, isCorrect: false }))
            : options,
    };
};

import joi from 'joi';

const examParYearSchema = joi.object({
    name: joi.string().required().messages({
        'string.base': 'Name must be a string',
        'any.required': 'Name is required'
    }),
    moduleId: joi.string().required().messages({
        'string.base': 'Module ID must be a string',
        'any.required': 'Module ID is required'
    }),
    year: joi.number().required().messages({
        'number.base': 'Year must be a number',
        'any.required': 'Year is required'
    }),
    imageUrl: joi.string().allow('', null).messages({
        'string.base': 'Image URL must be a string'
    }),
    infoText: joi.string().allow('', null).messages({
        'string.base': 'Info text must be a string'
    }),
    isOfficialCorrection: joi.boolean().default(true).messages({
        'boolean.base': 'Official correction must be a boolean'
    }),
    courseCategoryId: joi.string().allow('', null).messages({
        'string.base': 'Course Category ID must be a string'
    })
});

const updateExamParYearSchema = joi.object({
    name: joi.string().messages({
        'string.base': 'Name must be a string'
    }),
    moduleId: joi.string().messages({
        'string.base': 'Module ID must be a string'
    }),
    year: joi.number().messages({
        'number.base': 'Year must be a number'
    }),
    imageUrl: joi.string().allow('', null).messages({
        'string.base': 'Image URL must be a string'
    }),
    infoText: joi.string().allow('', null).messages({
        'string.base': 'Info text must be a string'
    }),
    isOfficialCorrection: joi.boolean().messages({
        'boolean.base': 'Official correction must be a boolean'
    }),
    courseCategoryId: joi.string().allow('', null).messages({
        'string.base': 'Course Category ID must be a string'
    })
});

export default { examParYearSchema, updateExamParYearSchema };

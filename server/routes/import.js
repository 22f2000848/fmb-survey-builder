const express = require('express');
const router = express.Router();
const multer = require('multer');
const ExcelJS = require('exceljs');
const { parse } = require('csv-parse/sync');
const fs = require('fs').promises;
const path = require('path');
const validator = require('../services/validator');

const STORE_PATH = path.join(__dirname, '../data/store.json');

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

// Read store
async function readStore() {
  const data = await fs.readFile(STORE_PATH, 'utf8');
  return JSON.parse(data);
}

// Write store
async function writeStore(data) {
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2));
}

// Helper function to parse XLSX file
async function parseXLSX(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const result = { surveys: [], questions: [] };
  
  // Parse Survey Master sheet
  const surveySheet = workbook.getWorksheet('Survey Master');
  if (surveySheet) {
    const headers = [];
    surveySheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value;
    });
    
    surveySheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const survey = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          // Map column names to field names
          const fieldName = mapSurveyColumnToField(header);
          survey[fieldName] = cell.value;
        }
      });
      
      if (survey.surveyId) {
        result.surveys.push(survey);
      }
    });
  }
  
  // Parse Question Master sheet
  const questionSheet = workbook.getWorksheet('Question Master');
  if (questionSheet) {
    const headers = [];
    questionSheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value;
    });
    
    const questionsByKey = {};
    
    questionSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const questionRow = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          const fieldName = mapQuestionColumnToField(header);
          questionRow[fieldName] = cell.value;
        }
      });
      
      if (questionRow.surveyId && questionRow.questionId) {
        const key = `${questionRow.surveyId}_${questionRow.questionId}_${questionRow.questionType}`;
        
        if (!questionsByKey[key]) {
          questionsByKey[key] = {
            surveyId: questionRow.surveyId,
            questionId: questionRow.questionId,
            questionType: questionRow.questionType,
            isDynamic: questionRow.isDynamic,
            isMandatory: questionRow.isMandatory,
            sourceQuestion: questionRow.sourceQuestion || '',
            textInputType: questionRow.textInputType || 'None',
            textLimitCharacters: questionRow.textLimitCharacters || '',
            maxValue: questionRow.maxValue || '',
            minValue: questionRow.minValue || '',
            tableHeaderValue: questionRow.tableHeaderValue || '',
            tableQuestionValue: questionRow.tableQuestionValue || '',
            questionMediaLink: questionRow.questionMediaLink || '',
            questionMediaType: questionRow.questionMediaType || 'None',
            mode: questionRow.mode || 'None',
            translations: {}
          };
        }
        
        // Add translation for this language
        const language = questionRow.medium || questionRow.mediumInEnglish || 'English';
        questionsByKey[key].translations[language] = {
          questionDescription: questionRow.questionDescription || '',
          questionDescriptionOptional: questionRow.questionDescriptionOptional || '',
          options: parseOptions(questionRow)
        };
      }
    });
    
    result.questions = Object.values(questionsByKey);
  }
  
  return result;
}

// Helper function to parse CSV file
async function parseCSV(filePath, sheetType) {
  const fileContent = await fs.readFile(filePath, 'utf8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  if (sheetType === 'survey') {
    return { surveys: records.map(mapSurveyRecord), questions: [] };
  } else if (sheetType === 'question') {
    // Group questions by key
    const questionsByKey = {};
    
    records.forEach(record => {
      const questionRow = mapQuestionRecord(record);
      if (questionRow.surveyId && questionRow.questionId) {
        const key = `${questionRow.surveyId}_${questionRow.questionId}_${questionRow.questionType}`;
        
        if (!questionsByKey[key]) {
          questionsByKey[key] = {
            surveyId: questionRow.surveyId,
            questionId: questionRow.questionId,
            questionType: questionRow.questionType,
            isDynamic: questionRow.isDynamic,
            isMandatory: questionRow.isMandatory,
            sourceQuestion: questionRow.sourceQuestion || '',
            textInputType: questionRow.textInputType || 'None',
            textLimitCharacters: questionRow.textLimitCharacters || '',
            maxValue: questionRow.maxValue || '',
            minValue: questionRow.minValue || '',
            tableHeaderValue: questionRow.tableHeaderValue || '',
            tableQuestionValue: questionRow.tableQuestionValue || '',
            questionMediaLink: questionRow.questionMediaLink || '',
            questionMediaType: questionRow.questionMediaType || 'None',
            mode: questionRow.mode || 'None',
            translations: {}
          };
        }
        
        const language = questionRow.medium || questionRow.mediumInEnglish || 'English';
        questionsByKey[key].translations[language] = {
          questionDescription: questionRow.questionDescription || '',
          questionDescriptionOptional: questionRow.questionDescriptionOptional || '',
          options: parseOptions(questionRow)
        };
      }
    });
    
    return { surveys: [], questions: Object.values(questionsByKey) };
  }
  
  return { surveys: [], questions: [] };
}

// Map Survey column names to field names
function mapSurveyColumnToField(columnName) {
  const mapping = {
    'Survey ID': 'surveyId',
    'Survey Name': 'surveyName',
    'Survey Description': 'surveyDescription',
    'available_mediums': 'availableMediums',
    'Hierarchical Access Level': 'hierarchicalAccessLevel',
    'Public': 'public',
    'In School': 'inSchool',
    'Accept multiple Entries': 'acceptMultipleEntries',
    'Launch Date': 'launchDate',
    'Close Date': 'closeDate',
    'Mode': 'mode',
    'visible_on_report_bot': 'visibleOnReportBot',
    'Is Active?': 'isActive',
    'Download_response': 'downloadResponse',
    'Geo Fencing': 'geoFencing',
    'Geo Tagging': 'geoTagging',
    'Test Survey': 'testSurvey'
  };
  return mapping[columnName] || columnName;
}

// Map Question column names to field names
function mapQuestionColumnToField(columnName) {
  const mapping = {
    'Survey ID': 'surveyId',
    'Medium': 'medium',
    'Medium_in_english': 'mediumInEnglish',
    'Question_ID': 'questionId',
    'Question Type': 'questionType',
    'IsDynamic': 'isDynamic',
    'Question_Description_Optional': 'questionDescriptionOptional',
    'Max_Value': 'maxValue',
    'Min_Value': 'minValue',
    'Is Mandatory': 'isMandatory',
    'Table_Header_value': 'tableHeaderValue',
    'Table_Question_value': 'tableQuestionValue',
    'Source_Question': 'sourceQuestion',
    'Text_input_type': 'textInputType',
    'text_limit_characters': 'textLimitCharacters',
    'Mode': 'mode',
    'Question_Media_Link': 'questionMediaLink',
    'Question_Media_Type': 'questionMediaType',
    'Question Description': 'questionDescription'
  };
  return mapping[columnName] || columnName;
}

function mapSurveyRecord(record) {
  const survey = {};
  Object.keys(record).forEach(key => {
    const fieldName = mapSurveyColumnToField(key);
    survey[fieldName] = record[key];
  });
  return survey;
}

function mapQuestionRecord(record) {
  const question = {};
  Object.keys(record).forEach(key => {
    const fieldName = mapQuestionColumnToField(key);
    question[fieldName] = record[key];
  });
  return question;
}

// Parse options from question row
function parseOptions(questionRow) {
  const options = [];
  
  for (let i = 1; i <= 15; i++) {
    const optionKey = `option${i}`;
    const optionText = questionRow[optionKey] || questionRow[`Option_${i}`];
    
    if (optionText) {
      const optionInEnglishKey = `option${i}InEnglish`;
      const optionChildrenKey = `option${i}Children`;
      
      options.push({
        text: optionText,
        textInEnglish: questionRow[optionInEnglishKey] || questionRow[`Option_${i}_in_English`] || optionText,
        children: questionRow[optionChildrenKey] || questionRow[`Option_${i}Children`] || ''
      });
    }
  }
  
  return options;
}

// POST /api/import - Import survey from XLSX/CSV
router.post('/', upload.single('file'), async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    let importData;
    
    if (fileExt === '.xlsx' || fileExt === '.xls') {
      importData = await parseXLSX(filePath);
    } else if (fileExt === '.csv') {
      const sheetType = req.query.sheetType || 'both';
      importData = await parseCSV(filePath, sheetType);
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload XLSX or CSV file.' });
    }
    
    // Validate imported data
    const errors = [];
    const store = await readStore();
    
    // Validate surveys
    importData.surveys.forEach((survey, index) => {
      const validation = validator.validateSurvey(survey);
      if (!validation.isValid) {
        errors.push({
          type: 'survey',
          index: index + 1,
          surveyId: survey.surveyId,
          errors: validation.errors
        });
      }
      
      // Check for duplicate survey IDs
      if (store.surveys.find(s => s.surveyId === survey.surveyId)) {
        errors.push({
          type: 'survey',
          index: index + 1,
          surveyId: survey.surveyId,
          errors: ['Survey ID already exists in the system']
        });
      }
    });
    
    // Validate questions
    importData.questions.forEach((question, index) => {
      const validation = validator.validateQuestion(question, store.questions);
      if (!validation.isValid) {
        errors.push({
          type: 'question',
          index: index + 1,
          questionId: question.questionId,
          errors: validation.errors
        });
      }
    });
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        validationErrors: errors,
        surveysCount: importData.surveys.length,
        questionsCount: importData.questions.length
      });
    }
    
    // Import data to store
    store.surveys.push(...importData.surveys);
    store.questions.push(...importData.questions);
    await writeStore(store);
    
    res.status(201).json({
      message: 'Import successful',
      surveysImported: importData.surveys.length,
      questionsImported: importData.questions.length,
      surveys: importData.surveys
    });
    
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      error: 'Failed to import file',
      message: error.message
    });
  } finally {
    // Clean up uploaded file
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error('Failed to delete uploaded file:', err);
      }
    }
  }
});

module.exports = router;

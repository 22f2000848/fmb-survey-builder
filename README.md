# FMB Survey Builder

A comprehensive web application for creating and managing surveys with automatic Excel export functionality. Built for the FMB product to streamline survey creation and data collection.

## Tech Stack

- **Frontend**: React 18 (functional components with hooks)
- **Backend**: Node.js with Express
- **Excel Generation**: ExcelJS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Storage**: JSON file-based storage

## Project Structure

```
fmb-survey-builder/
├── client/                          # React Frontend
│   ├── public/
│   │   └── index.html              # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── SurveyForm.jsx      # Survey creation/editing
│   │   │   ├── QuestionForm.jsx    # Dynamic question form with multi-language support
│   │   │   ├── TranslationPanel.jsx # Multi-language translation interface
│   │   │   ├── QuestionList.jsx    # Question management
│   │   │   ├── SurveyList.jsx      # Survey listing
│   │   │   └── Navigation.jsx      # Navigation component
│   │   ├── hooks/
│   │   │   └── useValidation.js    # Form validation hooks
│   │   ├── schemas/
│   │   │   ├── questionTypeSchema.js # Question type configurations
│   │   │   ├── languageMappings.js   # Language to native script mappings
│   │   │   └── validationConstants.js # Validation constants
│   │   ├── services/
│   │   │   └── api.js              # API service layer
│   │   ├── App.jsx                 # Main app component
│   │   ├── App.css                 # Styling
│   │   └── index.jsx               # Entry point
│   └── package.json
├── server/                          # Node.js Backend
│   ├── routes/
│   │   ├── surveys.js              # Survey CRUD endpoints
│   │   └── export.js               # Excel export endpoint
│   ├── services/
│   │   ├── excelGenerator.js       # ExcelJS implementation
│   │   └── validator.js            # Server-side validation
│   ├── data/
│   │   └── store.json.template     # Data storage template
│   ├── schemas/
│   │   └── validationRules.js      # Validation rules
│   ├── app.js                      # Express app configuration
│   └── package.json
├── .gitignore
└── README.md
```
## Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Github repo clone in VS code

```
git clone https://github.com/repo-sumit/fmb-survey-builder.git
```

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Initialize data store:
```bash
cp data/store.json.template data/store.json
```

4. Start the server:
```bash
npm start
```

The server will start on `http://localhost:5001`

For development with auto-reload:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open in your browser at `http://localhost:3000`

## Usage

### Creating a Survey

1. Click "Create New Survey" from the home page
2. Fill in all required survey details:
   - Survey ID (unique identifier, format: NAME_01)
   - Survey Name
   - Survey Description
   - **Available Mediums**: Select one or more languages from dropdown (English, Hindi, Bengali, etc.)
   - Various settings (Public, In School, etc.)
   - Launch and Close dates (format: DD/MM/YYYY HH:MM:SS)
3. Click "Create Survey"


#### Supported Languages

The system supports 10 languages with native script display:

| Language | Native Script |
|----------|---------------|
| English  | English       |
| Hindi    | हिन्दी        |
| Bengali  | বাংলা         |
| Assamese | অসমীয়া       |
| Bodo     | बड़ो          |
| Gujarati | ગુજરાતી       |
| Marathi  | मराठी         |
| Tamil    | தமிழ்         |
| Telugu   | తెలుగు        |
| Punjabi  | ਪੰਜਾਬੀ       |

#### Translation Data Structure

Questions are stored with a translations object:

```javascript
{
  questionId: 'Q1',
  questionType: 'Multiple Choice Single Select',
  isDynamic: 'Yes',
  isMandatory: 'Yes',
  translations: {
    'English': {
      questionDescription: 'What is your name?',
      options: [
        { text: 'John', textInEnglish: 'John', children: '' },
        { text: 'Jane', textInEnglish: 'Jane', children: '' }
      ]
    },
    'Hindi': {
      questionDescription: 'आपका नाम क्या है?',
      options: [
        { text: 'जॉन', textInEnglish: 'John', children: '' },
        { text: 'जेन', textInEnglish: 'Jane', children: '' }
      ]
    }
  }
}
```

### Exporting to Excel

1. Navigate to the questions page for a survey
2. Click "Export to Excel"
3. An Excel file will be downloaded with two sheets:
   - **Survey Master**: Survey metadata (17 columns)
   - **Question Master**: All questions with 84 columns in exact format

#### Multi-Language Export Behavior

For surveys with multiple languages, the export automatically duplicates question rows:

**Example**: A survey with 3 languages (English, Hindi, Bengali) and 2 questions:
- Question Q1 × 3 languages = 3 rows in Excel
- Question Q2 × 3 languages = 3 rows in Excel
- **Total**: 6 rows in Question Master sheet

Each row contains:
- **Medium**: Native script (English, हिन्दी, বাংলা)
- **Medium_in_english**: English name (English, Hindi, Bengali)
- **Question Description**: Translation for that language
- **Options**: Translated options for that language
- All other fields (Question ID, Type, settings) remain the same

This format matches the FMB reference specification for multi-language surveys.

## API Endpoints

### Surveys

- `GET /api/surveys` - List all surveys
- `GET /api/surveys/:id` - Get survey by ID
- `POST /api/surveys` - Create new survey
- `PUT /api/surveys/:id` - Update survey
- `DELETE /api/surveys/:id` - Delete survey

### Questions

- `GET /api/surveys/:id/questions` - Get all questions for a survey
- `POST /api/surveys/:id/questions` - Add question to survey
- `PUT /api/surveys/:id/questions/:questionId` - Update question
- `DELETE /api/surveys/:id/questions/:questionId` - Delete question

### Export

- `GET /api/export/:surveyId` - Download Excel dump for survey

### Validation

- `POST /api/validate-upload` - Validate CSV/XLSX file (query param: schema=survey|question|both)
- `GET /api/validation-schema` - Get validation rules schema

### Health Check

- `GET /api/health` - Server health check

### Supported File Formats

- **CSV (.csv)** - UTF-8 encoded, comma-separated values
- **Excel (.xlsx, .xls)** - Microsoft Excel format with one or more sheets

## Behavior Changes

- `availableMediums` now accepts either comma-separated string (`"English,Hindi"`) or array (`["English","Hindi"]`) and validates each trimmed entry.
- `PUT /api/surveys/:id` now rejects payloads where `surveyId` does not match `:id` with a `400` error.
- `POST /api/import` now rejects duplicate Survey IDs by default.
- `POST /api/import?overwrite=true` explicitly replaces existing surveys/questions for matching Survey IDs.
- Duplicate question API now supports optional `newQuestionId`; it validates format and uniqueness when provided.
- Export now uses quoted `Content-Disposition` filename with UTF-8-safe fallback.
- Translation route now enforces timeout, respects upstream URL port, and returns structured errors (`status`, `error`, `message`, `details`).
- CSV schema detection in upload validation now uses stronger header matching and supports explicit schema selection via `?schema=survey|question|both`.

## How To Validate

### 1) Install and run

Backend:

```bash
cd server
npm install
npm run dev
```

Frontend:

```bash
cd client
npm install
npm start
```

### 2) API checks (curl)

Create survey with `availableMediums` as string:

```bash
curl -X POST http://localhost:5001/api/surveys \
  -H "Content-Type: application/json" \
  -d '{"surveyId":"DOC_MEDIUM_STR","surveyName":"Doc Test","surveyDescription":"desc","availableMediums":"English,Hindi","public":"Yes","inSchool":"Yes","acceptMultipleEntries":"Yes","isActive":"Yes","downloadResponse":"No","geoFencing":"No","geoTagging":"No","testSurvey":"No","visibleOnReportBot":"No","mode":"New Data"}'
```

Create survey with `availableMediums` as array:

```bash
curl -X POST http://localhost:5001/api/surveys \
  -H "Content-Type: application/json" \
  -d '{"surveyId":"DOC_MEDIUM_ARR","surveyName":"Doc Test Array","surveyDescription":"desc","availableMediums":["English","Gujarati"],"public":"Yes","inSchool":"Yes","acceptMultipleEntries":"Yes","isActive":"Yes","downloadResponse":"No","geoFencing":"No","geoTagging":"No","testSurvey":"No","visibleOnReportBot":"No","mode":"New Data"}'
```

Survey update mismatch should fail:

```bash
curl -X PUT http://localhost:5001/api/surveys/DOC_MEDIUM_STR \
  -H "Content-Type: application/json" \
  -d '{"surveyId":"DIFFERENT_ID","surveyName":"Doc Test","surveyDescription":"desc","availableMediums":"English","public":"Yes","inSchool":"Yes","acceptMultipleEntries":"Yes","isActive":"Yes","downloadResponse":"No","geoFencing":"No","geoTagging":"No","testSurvey":"No","visibleOnReportBot":"No","mode":"New Data"}'
```

Import duplicate behavior:

```bash
# First import
curl -X POST http://localhost:5001/api/import -F "file=@./sample-survey.csv"

# Duplicate import should fail by default
curl -X POST http://localhost:5001/api/import -F "file=@./sample-survey.csv"

# Duplicate import should succeed with overwrite
curl -X POST "http://localhost:5001/api/import?overwrite=true" -F "file=@./sample-survey.csv"
```

Check export headers:

```bash
curl -I http://localhost:5001/api/export/DOC_MEDIUM_STR
```

### 3) UI checks

- Survey form: create/edit survey with multiple languages.
- Import screen: verify duplicate rejection by default and overwrite behavior when enabled.
- Question list: duplicate question with custom ID, conflict ID, and auto-generated ID.
- Question list export: verify file downloads and repeated downloads still work.


## Excel Format

### Survey Master Sheet (17 columns)
Survey ID, Survey Name, Survey Description, available_mediums, Hierarchical Access Level, Public, In School, Accept multiple Entries, Launch Date, Close Date, Mode, visible_on_report_bot, Is Active?, Download_response, Geo Fencing, Geo Tagging, Test Survey

### Question Master Sheet (84 columns)
Survey ID, Medium, Medium_in_english, Question_ID, Question Type, IsDynamic, Question_Description_Optional, Max_Value, Min_Value, Is Mandatory, Table_Header_value, Table_Question_value, Source_Question, Text_input_type, text_limit_characters, Mode, Question_Media_Link, Question_Media_Type, Question Description, Question Description (duplicate column), Option_1 through Option_20 (with _in_English and Children columns for each), Correct_Answer_Optional, Children Questions, Outcome Description


## Question Type Configuration

Each question type has specific field requirements and auto-configuration:

| Question Type | isDynamic | Max Options | Show Options | Show Table Fields | Show Children | Media Type |
|--------------|-----------|-------------|--------------|-------------------|---------------|------------|
| Multiple Choice Single Select | Yes | 20 | ✓ | ✗ | ✓ | None (fixed) |
| Multiple Choice Multi Select | Yes | 20 | ✓ | ✗ | ✗ | None (fixed) |
| Tabular Drop Down | Yes | 20 | ✓ | ✓ | ✗ | - |
| Tabular Text Input | No | - | ✗ | ✓ | ✗ | - |
| Tabular Check Box | No | - | ✗ | ✓ | ✗ | - |
| Text Response | Yes | - | ✗ | ✗ | ✗ | - |
| Image Upload | Yes | - | ✗ | ✗ | ✗ | - |
| Video Upload | No | - | ✗ | ✗ | ✗ | - |
| Voice Response | No | - | ✗ | ✗ | ✗ | - |
| Likert Scale | No | 20 | ✓ | ✗ | ✗ | - |
| Calendar | Yes | - | ✗ | ✗ | ✗ | - |
| Drop Down | Yes | 20 | ✓ | ✗ | ✗ | - |

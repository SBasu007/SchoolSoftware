CREATE TABLE agent(
    code TEXT PRIMARY KEY NOT NULL,
    name VARCHAR(200),
    add1 VARCHAR(200),
    add2 VARCHAR(200)
);

CREATE TABLE school(
    code TEXT PRIMARY KEY NOT NULL,
    name VARCHAR(200),
    add1 VARCHAR(200),
    add2 VARCHAR(200),
    auth_person VARCHAR(200),
    center_fee FLOAT,
    agent_code TEXT REFERENCES agent(code),
    agent_comm FLOAT
);
CREATE TABLE course (
    id SERIAL,
    year TEXT PRIMARY KEY NOT NULL,
    fees FLOAT,
    theory1 INTEGER,
    theory2 INTEGER,
    practical1 INTEGER,
    practical2 INTEGER,
);
CREATE TABLE student (
	roll TEXT PRIMARY KEY NOT NULL,
    session TEXT,
	year TEXT REFERENCES course(year),
	center_num TEXT REFERENCES school(code),
	admission_date TEXT,
	name VARCHAR(200),
	guard_name VARCHAR(200),
    add1 VARCHAR(200),
    add2 VARCHAR(200)
);

CREATE TABLE marks (
    id SERIAL PRIMARY KEY,
    roll TEXT REFERENCES student(roll),
    theory_1 INT,
    theory_2 INT,
    prac_1 INT,
    prac_2 INT,
    div FLOAT,
    division TEXT
)

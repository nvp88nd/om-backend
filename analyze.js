const fs = require('fs');
const path = require('path');

function findFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findFiles(filePath, files);
    } else if (filePath.endsWith('.entity.ts')) {
      files.push(filePath);
    }
  }
  return files;
}

const entityFiles = findFiles(path.join(__dirname, 'src', 'modules'));

const missingRelations = [];

for (const file of entityFiles) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find properties ending with _id
  // This regex looks for @Column(...) followed by modifiers and the property name ending in _id
  const regex = /@Column\([^)]*\)\s*(?:\/\/[^\n]*\n\s*)*?(?:@(?:IsOptional|IsString|IsUUID|IsNotEmpty|IsNumber|IsEnum|Index|ApiProperty)[^\n]*\n\s*)*?(?:public\s+|private\s+|protected\s+)?([a-zA-Z0-9_]+_id)\s*:/g;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    const idField = match[1];
    
    if (['reference_id', 'target_id'].includes(idField)) {
      continue;
    }
    
    const baseName = idField.replace(/_id$/, '');
    
    // Check for explicit JoinColumn
    const joinColumnRegex = new RegExp(`@JoinColumn\\s*\\(\\s*\\{[^}]*name\\s*:\\s*['"\`]${idField}['"\`][^}]*\\}\\s*\\)`);
    const hasJoinColumn = joinColumnRegex.test(content);
    
    // Check for relation property with the base name
    const relationRegex = new RegExp(`(?:@ManyToOne|@OneToOne|@OneToMany|@ManyToMany)[\\s\\S]*?(?:public\\s+|private\\s+|protected\\s+)?${baseName}\\s*:`);
    const hasRelationBaseName = relationRegex.test(content);

    // Also check if there's any relation with JoinColumn without name but property name matches baseName
    // actually TypeORM infers join column name as propertyName + "_" + referencedColumnName
    // so if property is `user`, it becomes `user_id`.
    
    if (!hasJoinColumn && !hasRelationBaseName) {
      // Just to be sure, check if there's ANY relation mapping to this field.
      // E.g. a relation where the property name is `parent` and it joins on `parent_id`
      
      missingRelations.push({ file, idField });
    }
  }
  
  // Also check if they just used @Column() without args
  const regex2 = /@Column\s*\(\s*\)\s*(?:\/\/[^\n]*\n\s*)*?(?:@(?:IsOptional|IsString|IsUUID|IsNotEmpty|IsNumber|IsEnum|Index|ApiProperty)[^\n]*\n\s*)*?(?:public\s+|private\s+|protected\s+)?([a-zA-Z0-9_]+_id)\s*:/g;
  while ((match = regex2.exec(content)) !== null) {
    const idField = match[1];
    
    if (['reference_id', 'target_id'].includes(idField)) {
      continue;
    }
    
    const baseName = idField.replace(/_id$/, '');
    const joinColumnRegex = new RegExp(`@JoinColumn\\s*\\(\\s*\\{[^}]*name\\s*:\\s*['"\`]${idField}['"\`][^}]*\\}\\s*\\)`);
    const hasJoinColumn = joinColumnRegex.test(content);
    const relationRegex = new RegExp(`(?:@ManyToOne|@OneToOne|@OneToMany|@ManyToMany)[\\s\\S]*?(?:public\\s+|private\\s+|protected\\s+)?${baseName}\\s*:`);
    const hasRelationBaseName = relationRegex.test(content);

    if (!hasJoinColumn && !hasRelationBaseName) {
      if (!missingRelations.find(m => m.file === file && m.idField === idField)) {
        missingRelations.push({ file, idField });
      }
    }
  }
}

console.log(JSON.stringify(missingRelations, null, 2));

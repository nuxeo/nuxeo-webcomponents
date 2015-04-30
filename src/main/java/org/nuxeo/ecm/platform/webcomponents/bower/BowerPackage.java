/*
 * (C) Copyright 2015 Nuxeo SA (http://nuxeo.com/) and contributors.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * Contributors:
 *      Nelson Silva
 */

package org.nuxeo.ecm.platform.webcomponents.bower;

import org.apache.commons.io.IOUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Bower package
 *
 * @since 7.3
 */
public class BowerPackage {

    protected static final Log log = LogFactory.getLog(BowerPackage.class);

    Map<String, Consumer<OutputStream>> entries = new HashMap<>();

    public void addEntry(String name, Consumer<OutputStream> writer) {
        entries.put(name, writer);
    }

    public void addEntry(String name, InputStream is) {
        entries.put(name, (os) -> {
            try {
                IOUtils.copy(is, os);
            } catch (IOException e) {
                log.error("Failed to write " + name, e);
            }
        });
    }

    public void write(OutputStream out) throws IOException{
        ZipOutputStream zos = null;
        try {
            zos = new ZipOutputStream(out);
            for (String name : entries.keySet()) {
                ZipEntry entry = new ZipEntry(name);
                zos.putNextEntry(entry);
                entries.get(name).accept(zos);
                zos.flush();
                zos.closeEntry();
            }
        } catch (IOException e) {
            log.error("Failed to produce bower package", e);
            throw(e);
        } finally {
            if (zos != null) {
                zos.close();
            }
        }

    }
}
